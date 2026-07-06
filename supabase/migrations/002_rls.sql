-- Lab 5 — Row Level Security : deny-by-default puis politiques par table.

-- Activation : des qu'on active RLS, tout acces est refuse tant qu'aucune
-- politique n'autorise l'action.
alter table public.profiles enable row level security;
alter table public.evenements enable row level security;
alter table public.inscriptions enable row level security;

-- ============================================================
-- evenements
-- ============================================================

-- Lecture publique (meme anonyme).
create policy "evenements_select_public"
  on public.evenements
  for select
  using (true);

-- Insertion pour un utilisateur authentifie, qui devient organisateur.
create policy "evenements_insert_auth"
  on public.evenements
  for insert
  to authenticated
  with check (organisateur_id = auth.uid());

-- Modification par le proprietaire seulement.
create policy "evenements_update_owner"
  on public.evenements
  for update
  to authenticated
  using (organisateur_id = auth.uid());

-- Suppression par le proprietaire seulement.
create policy "evenements_delete_owner"
  on public.evenements
  for delete
  to authenticated
  using (organisateur_id = auth.uid());

-- ============================================================
-- profiles
-- ============================================================

create policy "profiles_select_public"
  on public.profiles for select using (true);

create policy "profiles_insert_self"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- ============================================================
-- inscriptions
-- ============================================================

create policy "inscriptions_select_public"
  on public.inscriptions for select using (true);

-- Un utilisateur ne peut inscrire que lui-meme.
create policy "inscriptions_insert_self"
  on public.inscriptions for insert to authenticated
  with check (utilisateur_id = auth.uid());

-- Et se desinscrire uniquement de ses propres inscriptions.
create policy "inscriptions_delete_self"
  on public.inscriptions for delete to authenticated
  using (utilisateur_id = auth.uid());
