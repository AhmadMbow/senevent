import { getSupabase } from "./supabaseClient";

// Le nom part dans raw_user_meta_data : le trigger on_auth_user_created
// (Lab 5) le lit pour creer la ligne profiles dans la meme transaction.
export async function sInscrire(
  email: string,
  motDePasse: string,
  nom?: string
) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password: motDePasse,
    options: nom ? { data: { nom } } : undefined,
  });
  if (error) throw error;
  return data;
}

export async function seConnecter(email: string, motDePasse: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error) throw error;
  return data;
}

export async function seDeconnecter() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}
