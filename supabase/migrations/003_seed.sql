-- Lab 5 — Seed : 5 evenements initiaux.
-- Execute dans le SQL Editor du dashboard : tourne avec les droits complets,
-- donc contourne RLS (l'insert non authentifie serait bloque cote client).
insert into public.evenements (titre, categorie, lieu_nom, date_debut, prix, image_url)
values
  ('Concert acoustique de Youssou Junior', 'concert',
   'Theatre National Daniel Sorano', '2026-06-12 20:00:00+00', 5000,
   'https://placehold.co/400x250/1a3a5c/fff?text=Concert'),
  ('Expo photo : Dakar la nuit', 'expo',
   'Galerie le Manege', '2026-06-15 18:00:00+00', 0,
   'https://placehold.co/400x250/ea7d2b/fff?text=Expo'),
  ('Conference IA et sante en Afrique', 'conference',
   'Amphi UCAD 2', '2026-06-18 10:00:00+00', 0,
   'https://placehold.co/400x250/3aa84d/fff?text=Conf'),
  ('Atelier batik traditionnel', 'atelier',
   'Village Artisanal Soumbedioune', '2026-06-22 14:00:00+00', 3000,
   'https://placehold.co/400x250/cc1f1f/fff?text=Atelier'),
  ('Soutenance publique : energies renouvelables', 'soutenance',
   'ESP - UCAD', '2026-06-25 09:00:00+00', 0,
   'https://placehold.co/400x250/8a6d10/fff?text=These');
