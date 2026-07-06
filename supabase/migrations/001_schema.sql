-- Lab 5 — Schema SQL initial : profiles, evenements, inscriptions
-- Trois tables applicatives reliees a auth.users (fournie par Supabase).

-- profiles : prolonge auth.users avec nos champs applicatifs.
-- Une ligne dans profiles pour une ligne dans auth.users, meme id.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null,
  telephone text,
  role text not null default 'PUBLIC'
    check (role in ('PUBLIC', 'ORGANISATEUR', 'ADMIN')),
  created_at timestamptz not null default now()
);

-- evenements : le catalogue. Cle primaire auto-incrementee.
create table public.evenements (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) >= 3),
  categorie text not null
    check (categorie in ('concert', 'expo', 'conference', 'atelier', 'soutenance')),
  lieu_nom text not null,
  date_debut timestamptz not null,
  prix integer not null default 0 check (prix >= 0),
  image_url text,
  organisateur_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- inscriptions : table de liaison utilisateur <-> evenement.
-- unique(evenement_id, utilisateur_id) empeche la double inscription.
create table public.inscriptions (
  id bigint generated always as identity primary key,
  evenement_id bigint not null references public.evenements (id) on delete cascade,
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (evenement_id, utilisateur_id)
);
