import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Variables Supabase manquantes. Verifiez apps/web/.env.local"
  );
}

// Un seul client par application : persistance de session, ecoute des
// changements d'auth, connexion realtime. On l'importe partout ou on en a besoin.
export const supabase = createClient(url, anonKey);
