// Les categories possibles, alignees sur la contrainte SQL du Lab 5
export type Categorie =
  | "concert"
  | "expo"
  | "conference"
  | "atelier"
  | "soutenance";

// Un evenement tel qu'il vient de Supabase
export interface Evenement {
  id: number;
  titre: string;
  categorie: Categorie;
  lieu_nom: string;
  date_debut: string; // ISO 8601
  prix: number;
  image_url: string | null;
  organisateur_id: string | null;
  created_at: string;
}

// Les donnees pour CREER un evenement (sans les champs auto-generes)
export interface NouvelEvenementInput {
  titre: string;
  categorie: Categorie;
  lieu_nom: string;
  date_debut: string;
  prix: number;
  image_url?: string | null;
  organisateur_id: string;
}

// Un profil utilisateur
export interface Profile {
  id: string;
  nom: string;
  telephone: string | null;
  role: "PUBLIC" | "ORGANISATEUR" | "ADMIN";
  created_at: string;
}
