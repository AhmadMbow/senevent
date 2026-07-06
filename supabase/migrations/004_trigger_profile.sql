-- Lab 5 (bonus) — Trigger qui cree automatiquement la ligne profiles
-- quand un utilisateur est ajoute a auth.users. Le profil et le compte
-- naissent dans la meme transaction : impossible d'avoir un user sans profil.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', 'Invite'),
    'PUBLIC'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
