-- Vérifie les règles d'accès et la création de compte sur invitation.
-- Tout se passe dans une transaction annulée à la fin : la base n'en garde aucune trace.
-- Une règle non respectée lève une exception « ECHEC : ... » et arrête le script.

begin;

-- Deux binômes coach + créateur, créés par le vrai chemin : invitation, puis inscription.
insert into public.invitations (email, role, display_name)
values ('coach-a@test.local', 'coach', 'Coach A'), ('coach-b@test.local', 'coach', 'Coach B');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-00000000c0ac', 'coach-a@test.local'),
       ('bbbbbbbb-0000-4000-8000-00000000c0ac', 'coach-b@test.local');

insert into public.invitations (email, role, display_name, invited_by)
values ('createur-a@test.local', 'creator', 'Créateur A', 'aaaaaaaa-0000-4000-8000-00000000c0ac'),
       ('createur-b@test.local', 'creator', 'Créateur B', 'bbbbbbbb-0000-4000-8000-00000000c0ac');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-0000000c4ea7', 'createur-a@test.local'),
       ('bbbbbbbb-0000-4000-8000-0000000c4ea7', 'createur-b@test.local');

do $$
declare
  coach_a constant uuid := 'aaaaaaaa-0000-4000-8000-00000000c0ac';
  coach_b constant uuid := 'bbbbbbbb-0000-4000-8000-00000000c0ac';
  creator_a constant uuid := 'aaaaaaaa-0000-4000-8000-0000000c4ea7';
  creator_b constant uuid := 'bbbbbbbb-0000-4000-8000-0000000c4ea7';
  found_rows integer;
  refused boolean;
begin
  -- ----- Création de compte -----
  refused := false;
  begin
    insert into auth.users (id, email) values (gen_random_uuid(), 'inconnu@test.local');
  exception when others then
    refused := sqlerrm like '%not_invited%';
  end;
  if not refused then raise exception 'ECHEC : une adresse non invitée a pu créer un compte'; end if;

  select count(*) into found_rows from public.invitations where email like '%@test.local';
  if found_rows <> 0 then raise exception 'ECHEC : une invitation utilisée est restée valable'; end if;

  select count(*) into found_rows from public.profiles
  where (id = coach_a and role = 'coach') or (id = creator_a and role = 'creator');
  if found_rows <> 2 then raise exception 'ECHEC : les profils ne reprennent pas le rôle de l''invitation'; end if;

  select count(*) into found_rows from public.programs where creator_id = creator_a and coach_id = coach_a;
  if found_rows <> 1 then raise exception 'ECHEC : le programme ne relie pas le créateur à son coach'; end if;

  -- Une invitation en attente, envoyée par le coach B : seul lui doit la voir.
  insert into public.invitations (email, role, display_name, invited_by)
  values ('en-attente@test.local', 'creator', 'En attente', coach_b);

  -- ----- Le créateur A -----
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', creator_a, 'role', 'authenticated')::text, true);

  insert into public.day_logs (creator_id, day, done) values (creator_a, '2026-11-17', '{kit,stories}');
  insert into public.firsts (creator_id, key, done_on) values (creator_a, 'f_bio', '2026-11-17');
  insert into public.follower_stats (creator_id, day, followers) values (creator_a, '2026-11-23', 660);
  insert into public.hooks (creator_id, day, kind, hook) values (creator_a, '2026-11-17', 'reel', 'Test');

  refused := false;
  begin
    insert into public.day_logs (creator_id, day) values (creator_b, '2026-11-17');
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un créateur a écrit dans le suivi d''un autre'; end if;

  refused := false;
  begin
    update public.profiles set role = 'coach' where id = creator_a;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un créateur a pu modifier son rôle'; end if;

  update public.programs set forced_phase = 4, forced_phase_from = '2026-11-17' where creator_id = creator_a;
  get diagnostics found_rows = row_count;
  if found_rows <> 0 then raise exception 'ECHEC : un créateur a forcé sa propre phase'; end if;

  select count(*) into found_rows from public.profiles;
  if found_rows <> 2 then raise exception 'ECHEC : le créateur devrait voir 2 profils (lui et son coach), il en voit %', found_rows; end if;

  -- Depuis le coaching, un coach lit ses propres invitations : les autres comptes n'en voient aucune.
  select count(*) into found_rows from public.invitations;
  if found_rows <> 0 then raise exception 'ECHEC : un créateur voit une invitation qui n''est pas la sienne'; end if;

  -- ----- Le coach A -----
  perform set_config('request.jwt.claims', json_build_object('sub', coach_a, 'role', 'authenticated')::text, true);

  select count(*) into found_rows from public.day_logs where creator_id = creator_a;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne lit pas les journées de son créateur'; end if;
  select count(*) into found_rows from public.hooks;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne lit pas le carnet de son créateur'; end if;

  update public.day_logs set done = '{}' where creator_id = creator_a;
  get diagnostics found_rows = row_count;
  if found_rows <> 0 then raise exception 'ECHEC : le coach a modifié une journée du créateur'; end if;

  refused := false;
  begin
    insert into public.follower_stats (creator_id, day, followers) values (creator_a, '2026-11-24', 1);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : le coach a écrit un relevé à la place du créateur'; end if;

  update public.programs set forced_phase = 2, forced_phase_from = '2026-12-04' where creator_id = creator_a;
  get diagnostics found_rows = row_count;
  if found_rows <> 1 then raise exception 'ECHEC : le coach ne peut pas forcer la phase de son créateur'; end if;

  refused := false;
  begin
    update public.programs set coach_id = coach_a where creator_id = creator_b;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un coach a pu se rattacher un autre créateur'; end if;

  -- ----- Le créateur B, étranger au binôme A -----
  perform set_config('request.jwt.claims', json_build_object('sub', creator_b, 'role', 'authenticated')::text, true);

  select (select count(*) from public.day_logs) + (select count(*) from public.firsts)
       + (select count(*) from public.follower_stats) + (select count(*) from public.hooks)
    into found_rows;
  if found_rows <> 0 then raise exception 'ECHEC : un créateur voit le suivi d''un autre (% lignes)', found_rows; end if;

  select count(*) into found_rows from public.programs;
  if found_rows <> 1 then raise exception 'ECHEC : un créateur voit un autre programme que le sien'; end if;

  select count(*) into found_rows from public.profiles where id in (coach_a, creator_a);
  if found_rows <> 0 then raise exception 'ECHEC : un créateur voit les profils d''un autre binôme'; end if;

  -- ----- Sans connexion -----
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  refused := false;
  begin
    perform 1 from public.day_logs;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : le suivi est lisible sans connexion'; end if;

  refused := false;
  begin
    perform 1 from public.profiles;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : les profils sont lisibles sans connexion'; end if;

  refused := false;
  begin
    perform 1 from public.invitations;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception 'ECHEC : les invitations sont lisibles sans connexion'; end if;

  perform set_config('role', 'none', true);
end;
$$;

rollback;

select 'Règles d''accès conformes' as resultat;
