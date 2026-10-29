// Jetons de style de l'app mobile : couleurs, rayons, espacements.
// Un seul endroit pour la charte, les composants n'ecrivent plus de valeurs en dur.

export const couleurs = {
  fond: "#0b1622",
  fondEntete: "#16324f",
  carte: "#152438",
  voile: "rgba(255, 255, 255, 0.06)",
  voileFort: "rgba(255, 255, 255, 0.12)",
  bordure: "rgba(255, 255, 255, 0.08)",

  texte: "#f2f6fb",
  texteDoux: "#93a7bf",
  texteFaible: "#5d7591",

  accent: "#ea7d2b",
  accentClair: "#f4a259",
  erreur: "#ff7b72",
  succes: "#4cc38a",
};

// Degrade applique sous l'affiche pour que le texte blanc reste lisible
// quelle que soit l'image.
export const voileAffiche = [
  "rgba(11, 22, 34, 0)",
  "rgba(11, 22, 34, 0.35)",
  "rgba(21, 36, 56, 1)",
];

export const rayons = { s: 10, m: 14, l: 20, pilule: 999 };

export const espaces = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

// Les cinq categories de la contrainte SQL, avec leur identite visuelle.
// L'ordre sert aussi a l'affichage des filtres.
export const CATEGORIES = [
  { cle: "concert", label: "Concerts", icone: "musical-notes", couleur: "#e0533f" },
  { cle: "expo", label: "Expos", icone: "image", couleur: "#b57ded" },
  { cle: "conference", label: "Conferences", icone: "mic", couleur: "#3aa0e0" },
  { cle: "atelier", label: "Ateliers", icone: "color-palette", couleur: "#ea7d2b" },
  { cle: "soutenance", label: "Soutenances", icone: "school", couleur: "#3aa84d" },
];

export function infosCategorie(cle) {
  return (
    CATEGORIES.find((c) => c.cle === cle) ?? {
      cle,
      label: cle,
      icone: "sparkles",
      couleur: couleurs.accent,
    }
  );
}
