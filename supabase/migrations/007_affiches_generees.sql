-- Lab 8 — Affiches des cinq evenements de demonstration.
--
-- Le seed du Lab 5 (003_seed.sql) pointait vers des images placehold.co grises.
-- On les remplace par des visuels generes, pour que les cartes de l'app mobile
-- aient une vraie affiche (et la page Detail du web aussi).
--
-- A EXECUTER DEPUIS L'EDITEUR SQL DU DASHBOARD SUPABASE.
-- Impossible de le faire depuis un client : la politique evenements_update_owner
-- reserve l'UPDATE a l'organisateur authentifie, et ces evenements de seed
-- n'ont pas d'organisateur_id.
--
-- On cible par titre plutot que par id : les identifiants changent d'un
-- environnement a l'autre si la base est resemee, les titres du seed non.

update public.evenements
set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhWvMXfNohGlJQr9kjAPF1U7ip/hf_20260730_180354_f4101475-6e81-4a34-8d7b-e5a734e9bd81.png'
where titre = 'Concert acoustique de Youssou Junior';

update public.evenements
set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhWvMXfNohGlJQr9kjAPF1U7ip/hf_20260730_180358_0186c38a-70bd-4b64-ada2-c4ed4507907a.png'
where titre = 'Expo photo : Dakar la nuit';

update public.evenements
set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhWvMXfNohGlJQr9kjAPF1U7ip/hf_20260730_180402_8c02a356-4b54-4cf0-b331-483e5d5ea066.png'
where titre = 'Conference IA et sante en Afrique';

update public.evenements
set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhWvMXfNohGlJQr9kjAPF1U7ip/hf_20260730_180406_8ab3bca2-9b21-4cea-8447-3b4831c14375.png'
where titre = 'Atelier batik traditionnel';

update public.evenements
set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhWvMXfNohGlJQr9kjAPF1U7ip/hf_20260730_180410_6eb761cf-1373-4f25-a02f-db0647200c2f.png'
where titre = 'Soutenance publique : energies renouvelables';

-- ============================================================
-- Retour en arriere : valeurs d'origine du seed
-- ============================================================
-- update public.evenements set image_url = 'https://placehold.co/400x250/1a3a5c/fff?text=Concert'
--   where titre = 'Concert acoustique de Youssou Junior';
-- update public.evenements set image_url = 'https://placehold.co/400x250/ea7d2b/fff?text=Expo'
--   where titre = 'Expo photo : Dakar la nuit';
-- update public.evenements set image_url = 'https://placehold.co/400x250/3aa84d/fff?text=Conf'
--   where titre = 'Conference IA et sante en Afrique';
-- update public.evenements set image_url = 'https://placehold.co/400x250/cc1f1f/fff?text=Atelier'
--   where titre = 'Atelier batik traditionnel';
-- update public.evenements set image_url = 'https://placehold.co/400x250/8a6d10/fff?text=These'
--   where titre = 'Soutenance publique : energies renouvelables';
