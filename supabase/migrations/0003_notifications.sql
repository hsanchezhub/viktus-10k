-- Étape 4 : notifications. Les appareils abonnés, les clés du serveur d'envoi, le journal
-- des rappels, et la « sonnette » : la base prévient la fonction « push » à chaque nouveau
-- message du coach et à chaque heure. C'est la fonction qui envoie les notifications.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------------------------
-- Appareils abonnés
-- ---------------------------------------------------------------------------------------------

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  -- Le propriétaire est toujours le compte connecté : la base le remplit elle-même.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Adresse où le service de notifications du navigateur reçoit les messages pour cet appareil.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- La fonction écrit à cette adresse : seuls les services de notifications connus sont admis
  -- (Apple, Google, Mozilla, Microsoft), jamais une adresse choisie par l'utilisateur.
  constraint push_devices_endpoint_known check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)/'
  ),
  constraint push_devices_keys_plausible check (
    char_length(p256dh) between 80 and 100 and char_length(auth) between 16 and 64
  )
);
create index push_devices_user_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant select, delete on public.push_devices to authenticated;
grant insert (endpoint, p256dh, auth) on public.push_devices to authenticated;
grant select, delete on public.push_devices to service_role;

create policy "Chacun voit ses appareils abonnés" on public.push_devices
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Chacun abonne ses appareils" on public.push_devices
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Chacun désabonne ses appareils" on public.push_devices
  for delete to authenticated using (user_id = (select auth.uid()));

-- Un appareil n'appartient qu'à un compte à la fois : le dernier à s'y abonner le reprend,
-- et se réabonner remplace l'ancienne ligne au lieu d'échouer.
create function private.replace_push_device() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.push_devices where endpoint = new.endpoint;
  return new;
end;
$$;
revoke all on function private.replace_push_device() from public, anon, authenticated;

create trigger push_devices_replace before insert on public.push_devices
  for each row execute function private.replace_push_device();

-- ---------------------------------------------------------------------------------------------
-- Serveur d'envoi : une seule ligne
-- ---------------------------------------------------------------------------------------------

create table public.push_server (
  id boolean primary key default true check (id),
  -- Adresse de la fonction « push » de ce projet.
  function_url text not null,
  -- Jeton que la base joint à chaque appel : la fonction refuse tout appel qui ne l'a pas.
  ring_token text not null,
  -- Clés d'envoi (VAPID). La fonction les crée à son premier appel. La clé publique est
  -- donnée aux navigateurs qui s'abonnent, la clé privée ne sort jamais de la base.
  public_key text,
  private_jwk jsonb
);

alter table public.push_server enable row level security;
revoke all on public.push_server from anon, authenticated;
-- Les comptes connectés ne lisent qu'une colonne : la clé publique.
grant select (public_key) on public.push_server to authenticated;
grant select, update on public.push_server to service_role;

create policy "Tout compte connecté lit la clé publique des notifications" on public.push_server
  for select to authenticated using (true);

insert into public.push_server (function_url, ring_token)
values (
  'https://jcyufnhhfgfinoaapsha.supabase.co/functions/v1/push',
  gen_random_uuid()::text || gen_random_uuid()::text
);

-- ---------------------------------------------------------------------------------------------
-- Journal des rappels : un rappel d'un type donné ne part qu'une fois par jour et par compte
-- ---------------------------------------------------------------------------------------------

create table public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('matin', 'publication', 'montage')),
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);

-- Aucune règle d'accès : seuls la fonction (service_role) et l'administrateur y touchent.
alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;
grant select, insert on public.push_sent to service_role;

-- ---------------------------------------------------------------------------------------------
-- Messages du coach : annoncés une seule fois
-- ---------------------------------------------------------------------------------------------

-- Rempli par la fonction quand la notification du message est partie.
alter table public.coach_messages add column notified_at timestamptz;
-- Les messages déjà écrits ne seront pas annoncés après coup.
update public.coach_messages set notified_at = now();

-- Ce que la fonction lit et écrit pour envoyer messages et rappels.
grant select on public.coach_messages, public.programs, public.day_logs,
  public.follower_stats, public.hooks to service_role;
grant update (notified_at) on public.coach_messages to service_role;

-- ---------------------------------------------------------------------------------------------
-- La sonnette
-- ---------------------------------------------------------------------------------------------

-- Appelle la fonction « push ». L'appel part une fois la transaction validée, sans la bloquer.
create function private.ring_push(payload jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  server public.push_server;
begin
  select * into server from public.push_server;
  if not found then
    return;
  end if;
  perform net.http_post(
    url := server.function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ring-token', server.ring_token
    ),
    timeout_milliseconds := 15000
  );
end;
$$;
revoke all on function private.ring_push(jsonb) from public, anon, authenticated;

create function private.announce_coach_message() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform private.ring_push(jsonb_build_object('type', 'message', 'id', new.id));
  exception when others then
    -- Une notification qui ne part pas ne doit jamais empêcher d'enregistrer le message.
    raise warning 'Notification du message % non envoyée : %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function private.announce_coach_message() from public, anon, authenticated;

create trigger coach_messages_announce after insert on public.coach_messages
  for each row execute function private.announce_coach_message();

-- Chaque heure pile, la fonction regarde quels rappels sont dus (elle décide à l'heure de Paris).
select cron.schedule(
  'viktus-rappels',
  '0 * * * *',
  $$select private.ring_push('{"type": "reminders"}'::jsonb)$$
);
