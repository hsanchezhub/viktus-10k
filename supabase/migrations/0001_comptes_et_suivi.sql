-- Étape 2 : comptes, rôles, suivi du créateur.
--
-- Principe d'accès : le créateur lit et écrit ses propres lignes ; son coach les lit, sans
-- jamais les modifier. Personne d'autre ne voit rien. Les rôles ne se changent pas depuis le site.
--
-- Création de compte : fermée par défaut. Une adresse doit avoir été invitée (table invitations)
-- pour créer un compte ; l'invitation fixe le rôle et se consomme à la création.

-- Fonctions internes : hors du schéma exposé par l'API.
create schema if not exists private;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('creator', 'coach')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  instagram text,
  created_at timestamptz not null default now()
);

create table public.invitations (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('creator', 'coach')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  instagram text,
  invited_by uuid references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  -- Un créateur est toujours invité par son coach : c'est ce lien qui crée son programme.
  constraint creator_has_coach check (role = 'coach' or invited_by is not null)
);

create table public.programs (
  creator_id uuid primary key references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id),
  -- Phase forcée par le coach : elle vaut à partir de forced_phase_from, pas avant.
  forced_phase smallint check (forced_phase between 1 and 4),
  forced_phase_from date,
  created_at timestamptz not null default now(),
  constraint forced_phase_is_dated check ((forced_phase is null) = (forced_phase_from is null))
);
create index programs_coach_id_idx on public.programs (coach_id);

create table public.day_logs (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  done text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (creator_id, day)
);

create table public.firsts (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 40),
  done_on date not null,
  primary key (creator_id, key)
);

create table public.follower_stats (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  followers integer not null check (followers >= 0),
  updated_at timestamptz not null default now(),
  primary key (creator_id, day)
);

create table public.hooks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('reel', 'essai', 'carrousel')),
  hook text not null check (char_length(hook) between 1 and 200),
  views integer check (views >= 0),
  shares integer check (shares >= 0),
  follows integer check (follows >= 0),
  created_at timestamptz not null default now()
);
create index hooks_creator_day_idx on public.hooks (creator_id, day desc);

-- ---------------------------------------------------------------------------------------------
-- Date de dernière modification, tenue par la base
-- ---------------------------------------------------------------------------------------------

create function private.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger day_logs_touch before insert or update on public.day_logs
  for each row execute function private.touch_updated_at();
create trigger follower_stats_touch before insert or update on public.follower_stats
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Création de compte sur invitation
-- ---------------------------------------------------------------------------------------------

create function private.check_invitation() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.invitations i
    where i.email = lower(new.email) and i.expires_at > now()
  ) then
    raise exception 'not_invited';
  end if;
  return new;
end;
$$;

create function private.accept_invitation() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.invitations;
begin
  delete from public.invitations where email = lower(new.email) returning * into invitation;

  insert into public.profiles (id, role, display_name, instagram)
  values (new.id, invitation.role, invitation.display_name, invitation.instagram);

  if invitation.role = 'creator' then
    insert into public.programs (creator_id, coach_id) values (new.id, invitation.invited_by);
  end if;
  return new;
end;
$$;

revoke all on function private.check_invitation() from public, anon, authenticated;
revoke all on function private.accept_invitation() from public, anon, authenticated;

create trigger viktus_check_invitation before insert on auth.users
  for each row execute function private.check_invitation();
create trigger viktus_accept_invitation after insert on auth.users
  for each row execute function private.accept_invitation();

-- ---------------------------------------------------------------------------------------------
-- Règles d'accès par ligne
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.programs enable row level security;
alter table public.day_logs enable row level security;
alter table public.firsts enable row level security;
alter table public.follower_stats enable row level security;
alter table public.hooks enable row level security;

-- Aucun accès sans connexion.
revoke all on public.profiles, public.invitations, public.programs, public.day_logs,
  public.firsts, public.follower_stats, public.hooks from anon;

-- invitations : aucune règle, donc aucun accès depuis le site. Elles se gèrent côté base.
revoke all on public.invitations from authenticated;

-- programs : le créateur et son coach le lisent. Seul le coach le modifie, et seulement la phase.
revoke insert, update, delete on public.programs from authenticated;
grant update (forced_phase, forced_phase_from) on public.programs to authenticated;

create policy "Le créateur et son coach lisent le programme" on public.programs
  for select to authenticated
  using (creator_id = (select auth.uid()) or coach_id = (select auth.uid()));

create policy "Le coach règle la phase" on public.programs
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

-- profiles : lecture seule. Chacun voit son profil et celui de son coach ou de son créateur.
revoke insert, update, delete on public.profiles from authenticated;

create policy "Chacun lit son profil et celui de son binôme" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.programs p
      where (p.creator_id = (select auth.uid()) and p.coach_id = profiles.id)
         or (p.coach_id = (select auth.uid()) and p.creator_id = profiles.id)
    )
  );

-- Suivi : même règle sur les quatre tables.
create policy "Le créateur et son coach lisent les journées" on public.day_logs
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or exists (select 1 from public.programs p
               where p.creator_id = day_logs.creator_id and p.coach_id = (select auth.uid()))
  );
create policy "Le créateur ajoute ses journées" on public.day_logs
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "Le créateur modifie ses journées" on public.day_logs
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "Le créateur supprime ses journées" on public.day_logs
  for delete to authenticated using (creator_id = (select auth.uid()));

create policy "Le créateur et son coach lisent les premières fois" on public.firsts
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or exists (select 1 from public.programs p
               where p.creator_id = firsts.creator_id and p.coach_id = (select auth.uid()))
  );
create policy "Le créateur ajoute ses premières fois" on public.firsts
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "Le créateur modifie ses premières fois" on public.firsts
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "Le créateur supprime ses premières fois" on public.firsts
  for delete to authenticated using (creator_id = (select auth.uid()));

create policy "Le créateur et son coach lisent les abonnés" on public.follower_stats
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or exists (select 1 from public.programs p
               where p.creator_id = follower_stats.creator_id and p.coach_id = (select auth.uid()))
  );
create policy "Le créateur ajoute ses relevés d'abonnés" on public.follower_stats
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "Le créateur modifie ses relevés d'abonnés" on public.follower_stats
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "Le créateur supprime ses relevés d'abonnés" on public.follower_stats
  for delete to authenticated using (creator_id = (select auth.uid()));

create policy "Le créateur et son coach lisent le carnet des hooks" on public.hooks
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or exists (select 1 from public.programs p
               where p.creator_id = hooks.creator_id and p.coach_id = (select auth.uid()))
  );
create policy "Le créateur ajoute ses hooks" on public.hooks
  for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "Le créateur modifie ses hooks" on public.hooks
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "Le créateur supprime ses hooks" on public.hooks
  for delete to authenticated using (creator_id = (select auth.uid()));
