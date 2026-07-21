import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Initialise le client une seule fois, avec les cles fournies
// par l'application (web ou mobile).
export function initSupabase(url: string, anonKey: string): SupabaseClient {
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}

// Recupere le client deja initialise.
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      "Supabase non initialise. Appelez initSupabase(url, key) au demarrage."
    );
  }
  return client;
}
