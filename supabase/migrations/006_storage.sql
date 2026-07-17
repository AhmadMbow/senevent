-- Lab 6 (bonus) — Supabase Storage : bucket des affiches d'evenements.
-- Troisieme service Supabase utilise, apres Auth et PostgreSQL.
--
-- L'equivalent dashboard est : Storage -> New bucket -> nom "affiches", coche
-- Public. On le fait en SQL pour que le bucket vive dans les migrations, au
-- meme titre que le schema du Lab 5 : l'infrastructure reste reproductible.

-- Bucket public : les URL renvoyees par getPublicUrl() sont lisibles sans jeton.
insert into storage.buckets (id, name, public)
values ('affiches', 'affiches', true)
on conflict (id) do nothing;

-- Storage expose les fichiers comme des lignes de storage.objects : la securite
-- se pilote donc avec RLS, exactement comme sur nos tables applicatives.

-- Lecture pour tous, y compris anonyme (le catalogue est public).
drop policy if exists "affiches_select_public" on storage.objects;
create policy "affiches_select_public"
  on storage.objects for select
  using (bucket_id = 'affiches');

-- Upload reserve aux utilisateurs authentifies, et uniquement dans leur propre
-- dossier : le chemin doit commencer par leur uid ("<uid>/<timestamp>_<nom>").
-- storage.foldername(name) renvoie le tableau des segments du chemin.
drop policy if exists "affiches_insert_auth" on storage.objects;
create policy "affiches_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'affiches'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Suppression de ses propres fichiers seulement (meme regle de dossier).
drop policy if exists "affiches_delete_owner" on storage.objects;
create policy "affiches_delete_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'affiches'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
