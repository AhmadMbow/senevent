-- Lab 6 (correctif) — L'insertion du profil par le trigger de signup etait
-- bloquee par la RLS de public.profiles (auth.uid() est NULL dans le contexte
-- du trigger, donc la policy profiles_insert_self refusait la ligne).
--
-- On rend la fonction SECURITY DEFINER avec un search_path fige, et on autorise
-- explicitement le role interne supabase_auth_admin a inserer dans profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', 'Invite'),
    'PUBLIC'
  );
  return new;
end;
$$;

-- La fonction etant SECURITY DEFINER, le trigger s'execute sous le role
-- proprietaire (postgres), et non supabase_auth_admin : on autorise donc les
-- roles internes susceptibles d'executer l'insertion.
drop policy if exists "profiles_insert_trigger" on public.profiles;
create policy "profiles_insert_trigger"
  on public.profiles for insert
  to postgres, supabase_auth_admin, service_role
  with check (true);

grant insert on public.profiles to postgres, supabase_auth_admin, service_role;
