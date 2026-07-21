import { getSupabase } from "./supabaseClient";

export async function estInscrit(
  evenementId: number,
  utilisateurId: string
): Promise<boolean> {
  const { data } = await getSupabase()
    .from("inscriptions")
    .select("id")
    .eq("evenement_id", evenementId)
    .eq("utilisateur_id", utilisateurId);
  return (data ?? []).length > 0;
}

export async function inscrire(evenementId: number, utilisateurId: string) {
  const { error } = await getSupabase()
    .from("inscriptions")
    .insert({ evenement_id: evenementId, utilisateur_id: utilisateurId });
  if (error) throw error;
}

export async function desinscrire(evenementId: number, utilisateurId: string) {
  const { error } = await getSupabase()
    .from("inscriptions")
    .delete()
    .eq("evenement_id", evenementId)
    .eq("utilisateur_id", utilisateurId);
  if (error) throw error;
}
