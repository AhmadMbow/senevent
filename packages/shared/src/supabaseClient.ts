import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Initialise le client une seule fois, avec les cles fournies
// par l'application (web ou mobile).
// options : ce que la plateforme doit preciser elle-meme. Le web n'en passe
// pas (session dans le localStorage du navigateur) ; le mobile y donne
// AsyncStorage, faute de localStorage (Lab 12).
export function initSupabase(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient {
  if (!client) {
    client = createClient(url, anonKey, options);
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
