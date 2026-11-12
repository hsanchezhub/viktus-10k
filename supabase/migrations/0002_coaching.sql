-- Étape 3 : coaching. Les messages du coach au créateur, et l'invitation du créateur par le coach.

-- ---------------------------------------------------------------------------------------------
-- Messages du coach
-- ---------------------------------------------------------------------------------------------

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  -- L'auteur est toujours le coach connecté : la base le remplit elle-même.
  coach_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- Rempli quand le créateur a vu le message.
  read_at timestamptz
);
create index coach_messages_creator_idx on public.coach_messages (creator_id, created_at desc);
create index coach_messages_coach_idx on public.coach_messages (coach_id);

alter table public.coach_messages enable row level security;
revoke all on public.coach_messages from anon;

-- Le créateur ne peut modifier qu'une chose : marquer un message comme lu.
revoke update on public.coach_messages from authenticated;
grant update (read_at) on public.coach_messages to authenticated;

create policy "Le créateur et son coach lisent les messages" on public.coach_messages
  for select to authenticated
  using (creator_id = (select auth.uid()) or coach_id = (select auth.uid()));

create policy "Le coach écrit à son créateur" on public.coach_messages
  for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.programs p
                where p.creator_id = coach_messages.creator_id and p.coach_id = (select auth.uid()))
  );

create policy "Le créateur marque ses messages comme lus" on public.coach_messages
  for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

create policy "Le coach supprime ses messages" on public.coach_messages
  for delete to authenticated using (coach_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Invitation du créateur par son coach
-- ---------------------------------------------------------------------------------------------

-- Le coach ne choisit que l'adresse et le prénom : le rôle est vérifié par la règle,
-- la durée de validité reste celle de la base (7 jours).
grant select, delete on public.invitations to authenticated;
grant insert (email, role, display_name, invited_by) on public.invitations to authenticated;

create policy "Le coach voit ses invitations" on public.invitations
  for select to authenticated using (invited_by = (select auth.uid()));

-- Un seul créateur par coach pour l'instant : pas d'invitation si un programme existe déjà.
create policy "Le coach invite son créateur" on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and role = 'creator'
    and exists (select 1 from public.profiles me
                where me.id = (select auth.uid()) and me.role = 'coach')
    and not exists (select 1 from public.programs p where p.coach_id = (select auth.uid()))
  );

create policy "Le coach annule ses invitations" on public.invitations
  for delete to authenticated using (invited_by = (select auth.uid()));
