-- Vérifie les règles d'accès du coaching : messages du coach et invitation du créateur.
-- Tout se passe dans une transaction annulée à la fin : la base n'en garde aucune trace.
-- Une règle non respectée lève une exception « ECHEC : ... » et arrête le script.

begin;

-- Deux binômes complets (A et B) et un coach C qui n'a pas encore de créateur.
insert into public.invitations (email, role, display_name)
values ('coach-a@test.local', 'coach', 'Coach A'), ('coach-b@test.local', 'coach', 'Coach B'),
       ('coach-c@test.local', 'coach', 'Coach C');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-00000000c0ac', 'coach-a@test.local'),
       ('bbbbbbbb-0000-4000-8000-00000000c0ac', 'coach-b@test.local'),
       ('cccccccc-0000-4000-8000-00000000c0ac', 'coach-c@test.local');

insert into public.invitations (email, role, display_name, invited_by)
values ('createur-a@test.local', 'creator', 'Créateur A', 'aaaaaaaa-0000-4000-8000-00000000c0ac'),
       ('createur-b@test.local', 'creator', 'Créateur B', 'bbbbbbbb-0000-4000-8000-00000000c0ac');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-0000000c4ea7', 'createur-a@test.local'),
       ('bbbbbbbb-0000-4000-8000-0000000c4ea7', 'createur-b@test.local');

do $$
declare
  coach_a constant uuid := 'aaaaaaaa-0000-4000-8000-00000000c0ac';
  coach_c constant uuid := 'cccccccc-0000-4000-8000-00000000c0ac';
  creator_a constant uuid := 'aaaaaaaa-0000-4000-8000-0000000c4ea7';
  creator_b constant uuid := 'bbbbbbbb-0000-4000-8000-0000000c4ea7';
  found_rows integer;
  refused boolean;
begin
  perform set_config('role', 'authenticated', true);

  -- ----- Le coach A écrit -----
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated')::text, true);

  insert into public.coach_messages (creator_id, body) values (creator_a, 'Bravo pour ta semaine.');
  select count(*) into found_rows from public.coach_messages where coach_id = coach_a;
  if found_rows <> 1 then raise exception 'ECHEC : le message du coach n''est pas signé de son compte'; end if;

  refused := false;
  begin
    insert into public.coach_messages (creator_id, body) values (creator_b, 'Message à un inconnu');
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach a écrit au créateur d''un autre coach'; end if;

  refused := false;
  begin
    insert into public.invitations (email, role, display_name, invited_by)
    values ('deuxieme@test.local', 'creator', 'Deuxième', coach_a);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach qui a déjà un créateur a pu en inviter un autre'; end if;

  -- ----- Le créateur A lit -----
  perform set_config('request.jwt.claims', json_build_object('sub', creator_a, 'role', 'authenticated')::text, true);

  select count(*) into found_rows from public.coach_messages;
  if found_rows <> 1 then raise exception 'ECHEC : le créateur ne lit pas le message de son coach'; end if;

  update public.coach_messages set read_at = now() where creator_id = creator_a and read_at is null;
  get diagnostics found_rows = row_count;
  if found_rows <> 1 then raise exception 'ECHEC : le créateur ne peut pas marquer le message comme lu'; end if;

  refused := false;
  begin
    update public.coach_messages set body = 'Message réécrit' where creator_id = creator_a;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : le créateur a pu réécrire un message du coach'; end if;

  refused := false;
  begin
    insert into public.coach_messages (creator_id, body) values (creator_a, 'Je m''écris à moi-même');
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un créateur a pu écrire un message de coach'; end if;

  delete from public.coach_messages where creator_id = creator_a;
  get diagnostics found_rows = row_count;
  if found_rows <> 0 then raise exception 'ECHEC : le créateur a supprimé un message du coach'; end if;

  refused := false;
  begin
    insert into public.invitations (email, role, display_name, invited_by)
    values ('ami@test.local', 'creator', 'Ami', creator_a);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un créateur a pu inviter quelqu''un'; end if;

  -- ----- Le créateur B, étranger au binôme A -----
  perform set_config('request.jwt.claims', json_build_object('sub', creator_b, 'role', 'authenticated')::text, true);
  select count(*) into found_rows from public.coach_messages;
  if found_rows <> 0 then raise exception 'ECHEC : un créateur lit les messages d''un autre binôme'; end if;

  -- ----- Le coach C invite son créateur -----
  perform set_config('request.jwt.claims', json_build_object('sub', coach_c, 'role', 'authenticated')::text, true);

  insert into public.invitations (email, role, display_name, invited_by)
  values ('createur-c@test.local', 'creator', 'Créateur C', coach_c);
  select count(*) into found_rows from public.invitations;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne voit pas son invitation'; end if;

  refused := false;
  begin
    insert into public.invitations (email, role, display_name, invited_by)
    values ('faux-coach@test.local', 'coach', 'Faux coach', coach_c);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach a pu inviter un autre coach'; end if;

  refused := false;
  begin
    insert into public.invitations (email, role, display_name, invited_by)
    values ('au-nom-d-un-autre@test.local', 'creator', 'Usurpé', coach_a);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach a pu inviter au nom d''un autre coach'; end if;

  refused := false;
  begin
    insert into public.invitations (email, role, display_name, invited_by, expires_at)
    values ('sans-fin@test.local', 'creator', 'Sans fin', coach_c, now() + interval '10 years');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach a pu choisir la durée de validité d''une invitation'; end if;

  -- ----- Le coach A ne voit ni ne touche l'invitation du coach C -----
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated')::text, true);

  select count(*) into found_rows from public.invitations;
  if found_rows <> 0 then raise exception 'ECHEC : un coach voit l''invitation d''un autre coach'; end if;

  delete from public.invitations where email = 'createur-c@test.local';
  get diagnostics found_rows = row_count;
  if found_rows <> 0 then raise exception 'ECHEC : un coach a annulé l''invitation d''un autre coach'; end if;

  select count(*) into found_rows from public.coach_messages where read_at is not null;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne voit pas que son message a été lu'; end if;

  delete from public.coach_messages where coach_id = coach_a;
  get diagnostics found_rows = row_count;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne peut pas supprimer son message'; end if;

  perform set_config('role', 'none', true);
end;
$$;

rollback;

select 'Règles d''accès du coaching conformes' as resultat;
