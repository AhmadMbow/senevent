// Formatage des dates et des prix.
// On ecrit les libelles a la main plutot que d'utiliser toLocaleDateString :
// le support d'Intl varie selon les moteurs JS embarques (Hermes), et on veut
// exactement le meme rendu sur Android et sur iOS.

const MOIS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

const MOIS_COURT = [
  "JAN", "FEV", "MAR", "AVR", "MAI", "JUIN",
  "JUIL", "AOUT", "SEP", "OCT", "NOV", "DEC",
];

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

// "12" — le numero du jour, pour la pastille de date.
export function jourDuMois(iso) {
  return String(new Date(iso).getDate());
}

// "JUIN" — le mois abrege, pour la pastille de date.
export function moisCourt(iso) {
  return MOIS_COURT[new Date(iso).getMonth()];
}

// "jeu. 12 juin" — la date lisible dans la ligne d'informations.
export function dateLisible(iso) {
  const d = new Date(iso);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

// "20:00" — l'heure de debut.
export function heure(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 5000 -> "5 000 FCFA", 0 -> "Gratuit".
export function formaterPrix(prix) {
  if (!prix) return "Gratuit";
  const groupe = String(prix).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${groupe} FCFA`;
}
