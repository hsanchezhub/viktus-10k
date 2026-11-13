-- Vérifie les règles d'accès des notifications : appareils abonnés, clés du serveur d'envoi,
-- journal des rappels. Tout se passe dans une transaction annulée à la fin : la base n'en
-- garde aucune trace, et aucun appel ne part vers la fonction « push ».
-- Une règle non respectée lève une exception « ECHEC : ... » et arrête le script.

begin;

insert into public.invitations (email, role, display_name)
values ('coach-n@test.local', 'coach', 'Coach N');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-00000000c0ac', 'coach-n@test.local');
insert into public.invitations (email, role, display_name, invited_by)
values ('createur-n@test.local', 'creator', 'Créateur N', 'aaaaaaaa-0000-4000-8000-00000000c0ac');
insert into auth.users (id, email)
values ('aaaaaaaa-0000-4000-8000-0000000c4ea7', 'createur-n@test.local');

do $$
declare
  coach constant uuid := 'aaaaaaaa-0000-4000-8000-00000000c0ac';
  creator constant uuid := 'aaaaaaaa-0000-4000-8000-0000000c4ea7';
  device_endpoint constant text := 'https://web.push.apple.com/appareil-de-test';
  device_key constant text := repeat('A', 87);
  auth_secret constant text := repeat('B', 22);
  found_rows integer;
  found_text text;
  refused boolean;
begin
  if (select count(*) from public.push_server) <> 1 then
    raise exception 'ECHEC : la ligne du serveur d''envoi est absente';
  end if;

  perform set_config('role', 'authenticated', true);

  -- ----- Le créateur abonne son téléphone -----
  perform set_config('request.jwt.claims', json_build_object('sub', creator, 'role', 'authenticated')::text, true);

  insert into public.push_devices (endpoint, p256dh, auth) values (device_endpoint, device_key, auth_secret);
  select count(*) into found_rows from public.push_devices where user_id = creator;
  if found_rows <> 1 then raise exception 'ECHEC : l''appareil n''est pas rattaché au compte connecté'; end if;

  -- Se réabonner remplace l'ancienne ligne au lieu d'échouer.
  insert into public.push_devices (endpoint, p256dh, auth) values (device_endpoint, device_key, auth_secret);
  select count(*) into found_rows from public.push_devices;
  if found_rows <> 1 then raise exception 'ECHEC : un réabonnement a créé un doublon'; end if;

  refused := false;
  begin
    insert into public.push_devices (user_id, endpoint, p256dh, auth)
    values (coach, 'https://web.push.apple.com/pour-un-autre', device_key, auth_secret);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte a pu abonner un appareil au nom d''un autre'; end if;

  refused := false;
  begin
    insert into public.push_devices (endpoint, p256dh, auth)
    values ('https://exemple.test/abonnement', device_key, auth_secret);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : une adresse hors des services de notifications a été acceptée'; end if;

  refused := false;
  begin
    insert into public.push_devices (endpoint, p256dh, auth)
    values ('https://web.push.apple.com.exemple.test/abonnement', device_key, auth_secret);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : une adresse qui imite un service de notifications a été acceptée'; end if;

  -- ----- Clés du serveur d'envoi -----
  select public_key into found_text from public.push_server;

  refused := false;
  begin
    select private_jwk::text into found_text from public.push_server;
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a lu la clé privée du serveur d''envoi'; end if;

  refused := false;
  begin
    select ring_token into found_text from public.push_server;
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a lu le jeton de la sonnette'; end if;

  refused := false;
  begin
    update public.push_server set public_key = 'autre';
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a pu changer les clés du serveur d''envoi'; end if;

  -- ----- Journal des rappels -----
  refused := false;
  begin
    insert into public.push_sent (user_id, kind, day) values (creator, 'matin', current_date);
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a pu écrire dans le journal des rappels'; end if;

  refused := false;
  begin
    select count(*) into found_rows from public.push_sent;
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a pu lire le journal des rappels'; end if;

  -- ----- Le coach ne voit ni ne retire l'appareil du créateur -----
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);

  select count(*) into found_rows from public.push_devices;
  if found_rows <> 0 then raise exception 'ECHEC : le coach voit les appareils de son créateur'; end if;

  delete from public.push_devices where endpoint = device_endpoint;
  perform set_config('role', 'none', true);
  select count(*) into found_rows from public.push_devices;
  if found_rows <> 1 then raise exception 'ECHEC : le coach a retiré l''appareil de son créateur'; end if;
  perform set_config('role', 'authenticated', true);

  -- Le coach écrit : l'annonce du message est réservée à la fonction.
  insert into public.coach_messages (creator_id, body) values (creator, 'Bravo.');
  refused := false;
  begin
    update public.coach_messages set notified_at = now();
  exception when others then refused := true;
  end;
  if not refused then raise exception 'ECHEC : un compte connecté a pu marquer un message comme annoncé'; end if;

  -- ----- Le même téléphone passe à un autre compte : il le reprend -----
  insert into public.push_devices (endpoint, p256dh, auth) values (device_endpoint, device_key, auth_secret);
  perform set_config('role', 'none', true);
  select count(*) into found_rows from public.push_devices where user_id = creator;
  if found_rows <> 0 then raise exception 'ECHEC : l''appareil est resté abonné à son ancien compte'; end if;
  select count(*) into found_rows from public.push_devices where user_id = coach;
  if found_rows <> 1 then raise exception 'ECHEC : l''appareil n''a pas été repris par le nouveau compte'; end if;

  -- ----- La sonnette et l'horloge sont en place -----
  if (select count(*) from cron.job where jobname = 'viktus-rappels') <> 1 then
    raise exception 'ECHEC : le rappel de chaque heure n''est pas planifié';
  end if;
  if has_function_privilege('authenticated', 'private.ring_push(jsonb)', 'execute') then
    raise exception 'ECHEC : un compte connecté peut sonner la fonction d''envoi';
  end if;
end;
$$;

rollback;

select 'Règles d''accès des notifications conformes' as resultat;
