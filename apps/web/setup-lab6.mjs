// Lab 6 — Prepare les comptes de test et collecte les preuves d'execution
// (INSERT, inscription, refus RLS). Les captures d'ecran, elles, sont prises
// par capture-lab6.mjs une fois ces comptes en place.
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("./.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter(l => l.includes("="))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

const api = async (chemin, options = {}) => {
  const r = await fetch(`${URL_}${chemin}`, {
    ...options,
    headers: {
      apikey: KEY,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const texte = await r.text();
  let corps = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    corps = texte;
  }
  return { statut: r.status, corps };
};

// Un compte par role du scenario. On utilise le plus-addressing de l'adresse du
// proprietaire du projet : deliverable (le validateur Supabase exige un domaine
// avec des MX) et sans risque d'ecrire a un inconnu.
// Le mot de passe des comptes de test ne vit pas dans le depot (Lab 11).
const MDP = process.env.SENEVENT_MDP_TEST;
if (!MDP) {
  console.error("Definir SENEVENT_MDP_TEST (mot de passe des comptes de test).");
  process.exit(1);
}
const COMPTES = {
  A: { email: "ahmadoussj+lab6a@gmail.com", password: MDP, nom: "Atou Diop" },
  B: { email: "ahmadoussj+lab6b@gmail.com", password: MDP, nom: "Khady Ndiaye" },
};

const connecter = async compte => {
  // Signup d'abord ; si le compte existe deja, on bascule sur le login.
  const inscription = await api("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({
      email: compte.email,
      password: compte.password,
      data: { nom: compte.nom },
    }),
  });
  if (inscription.corps?.access_token) {
    return { token: inscription.corps.access_token, id: inscription.corps.user.id, neuf: true };
  }
  const login = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: compte.email, password: compte.password }),
  });
  if (!login.corps?.access_token) {
    throw new Error(
      `Auth impossible pour ${compte.email} : ${JSON.stringify(inscription.corps)} / ${JSON.stringify(login.corps)}`
    );
  }
  return { token: login.corps.access_token, id: login.corps.user.id, neuf: false };
};

const commeUtilisateur = (token, chemin, options = {}) =>
  api(chemin, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });

const preuves = {};

// --- Comptes -------------------------------------------------------------
const A = await connecter(COMPTES.A);
const B = await connecter(COMPTES.B);
console.log("compte A", A.id, A.neuf ? "(cree)" : "(existant)");
console.log("compte B", B.id, B.neuf ? "(cree)" : "(existant)");

// Le trigger du Lab 5 doit avoir cree les profils avec le bon nom.
const profils = await api(
  `/rest/v1/profiles?select=id,nom&id=in.(${A.id},${B.id})`
);
preuves.profils = profils.corps;
console.log("profils crees par le trigger :", JSON.stringify(profils.corps));

// --- INSERT : A cree un evenement ---------------------------------------
const creation = await commeUtilisateur(A.token, "/rest/v1/evenements", {
  method: "POST",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify({
    titre: "Nuit du code UCAD",
    categorie: "atelier",
    lieu_nom: "ESP - UCAD",
    date_debut: "2026-08-14T18:00:00+00:00",
    prix: 2000,
    image_url: "https://placehold.co/400x250/1a3a5c/fff?text=atelier",
    organisateur_id: A.id,
  }),
});
const evenementA = creation.corps?.[0];
preuves.insert = { statut: creation.statut, evenement: evenementA };
console.log("INSERT par A ->", creation.statut, evenementA?.id);

// --- RLS : B tente d'usurper l'organisateur_id de A ----------------------
const usurpation = await commeUtilisateur(B.token, "/rest/v1/evenements", {
  method: "POST",
  body: JSON.stringify({
    titre: "Evenement usurpe",
    categorie: "concert",
    lieu_nom: "Nulle part",
    date_debut: "2026-08-15T18:00:00+00:00",
    prix: 0,
    organisateur_id: A.id, // pas son propre uid : with check doit refuser
  }),
});
preuves.insertUsurpe = { statut: usurpation.statut, corps: usurpation.corps };
console.log("INSERT usurpe par B ->", usurpation.statut, JSON.stringify(usurpation.corps)?.slice(0, 120));

// --- Inscription : B s'inscrit a l'evenement de A ------------------------
const inscription = await commeUtilisateur(B.token, "/rest/v1/inscriptions", {
  method: "POST",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify({ evenement_id: evenementA.id, utilisateur_id: B.id }),
});
preuves.inscription = { statut: inscription.statut, ligne: inscription.corps?.[0] };
console.log("inscription de B ->", inscription.statut);

// Double inscription : la contrainte unique du Lab 5 doit refuser.
const doublon = await commeUtilisateur(B.token, "/rest/v1/inscriptions", {
  method: "POST",
  body: JSON.stringify({ evenement_id: evenementA.id, utilisateur_id: B.id }),
});
preuves.doublon = { statut: doublon.statut, corps: doublon.corps };
console.log("double inscription ->", doublon.statut, doublon.corps?.code);

// --- DELETE refuse : B tente de supprimer l'evenement de A ---------------
const suppressionB = await commeUtilisateur(
  B.token,
  `/rest/v1/evenements?id=eq.${evenementA.id}`,
  { method: "DELETE", headers: { Prefer: "return=representation" } }
);
const restant = await api(`/rest/v1/evenements?select=id,titre&id=eq.${evenementA.id}`);
preuves.deleteRefuse = {
  statut: suppressionB.statut,
  lignesTouchees: Array.isArray(suppressionB.corps) ? suppressionB.corps.length : null,
  evenementToujoursLa: restant.corps?.length === 1,
};
console.log(
  "DELETE par B ->",
  suppressionB.statut,
  "lignes touchees:",
  preuves.deleteRefuse.lignesTouchees,
  "| evenement toujours la:",
  preuves.deleteRefuse.evenementToujoursLa
);

// --- Storage : A televerse une affiche -----------------------------------
// PNG 1x1 minimal, suffisant pour prouver le chemin upload -> getPublicUrl.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const chemin = `${A.id}/${Date.now()}_affiche.png`;
const upload = await fetch(`${URL_}/storage/v1/object/affiches/${chemin}`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${A.token}`,
    "Content-Type": "image/png",
  },
  body: png,
});
preuves.storage = {
  statut: upload.status,
  corps: await upload.text(),
  urlPublique: `${URL_}/storage/v1/object/public/affiches/${chemin}`,
};
console.log("upload Storage ->", upload.status);

// B tente d'ecrire dans le dossier de A : la policy de chemin doit refuser.
const uploadUsurpe = await fetch(
  `${URL_}/storage/v1/object/affiches/${A.id}/pirate.png`,
  {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${B.token}`,
      "Content-Type": "image/png",
    },
    body: png,
  }
);
preuves.storageUsurpe = { statut: uploadUsurpe.status, corps: await uploadUsurpe.text() };
console.log("upload usurpe par B ->", uploadUsurpe.status);

writeFileSync(
  new URL("./preuves-lab6.json", import.meta.url),
  JSON.stringify({ comptes: { A: A.id, B: B.id }, ...preuves }, null, 2)
);
console.log("\npreuves ecrites dans apps/web/preuves-lab6.json");
