// Lab 8 — Captures de l'ecran mobile pour le rapport.
//
// Expo Go ne permet pas de piloter le telephone depuis un script. On rend donc
// la MEME application sur la cible web d'Expo (react-native-web), dans une
// fenetre au format telephone. C'est le meme App.js, les memes composants et
// le meme appel a getEvenements() : seul le moteur de rendu change.
//
// Prerequis : `npx expo start --web --port 8090` doit tourner a cote.
//
// react-dom / react-native-web / puppeteer-core sont en devDependencies :
// l'application livree n'en depend pas, ils ne servent qu'a produire ce rapport.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:8090";
const OUT = "/tmp/senevent-lab8-screens";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

// Format d'un telephone courant, en densite x3 pour un rendu net dans le PDF.
const format = { width: 390, height: 844, deviceScaleFactor: 3 };

// On enregistre les domaines contactes : c'est la preuve que la donnee vient
// bien de Supabase et que les affiches viennent du CDN.
const domaines = new Set();

async function nouvelOnglet() {
  const page = await browser.newPage();
  await page.setViewport(format);
  page.on("request", (r) => {
    try {
      domaines.add(new URL(r.url()).hostname);
    } catch {}
  });
  return page;
}

const shot = async (page, nom) => {
  await page.screenshot({ path: `${OUT}/${nom}.png` });
  console.log("capture", nom);
};

// ---------------------------------------------------------------
// 1. Etat de chargement : on ralentit la requete Supabase pour avoir
//    le temps de photographier les cartes squelettes.
// ---------------------------------------------------------------
const pageChargement = await nouvelOnglet();
await pageChargement.setRequestInterception(true);
pageChargement.on("request", async (req) => {
  if (req.url().includes("supabase.co/rest")) {
    await sleep(3000);
  }
  req.continue().catch(() => {});
});
await pageChargement.goto(BASE, { waitUntil: "domcontentloaded" });
await sleep(2500);
await shot(pageChargement, "01-chargement");
await pageChargement.close();

// ---------------------------------------------------------------
// 2. Liste chargee, avec les affiches
// ---------------------------------------------------------------
const page = await nouvelOnglet();
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2500);
await shot(page, "02-accueil");

// Nombre d'evenements annonce par l'en-tete. On cherche le noeud dont le texte
// est EXACTEMENT le sous-titre, sinon on remonte jusqu'a la racine de l'app.
const sousTitre = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find((d) =>
    /^\d+ evenements? a Dakar$/.test(d.textContent?.trim() ?? "")
  );
  return el ? el.textContent.trim() : null;
});

// ---------------------------------------------------------------
// 3. Filtre par categorie
// ---------------------------------------------------------------
const clique = await page.evaluate(() => {
  const cible = [...document.querySelectorAll("div")].find(
    (d) => d.textContent?.trim() === "Concerts"
  );
  if (!cible) return false;
  cible.closest("[tabindex], div")?.click();
  cible.click();
  return true;
});
await sleep(1200);
await shot(page, "03-filtre-concerts");

// Le badge porte le texte en minuscules dans le DOM : la majuscule vient de
// textTransform, qui est purement visuel.
const cartesApresFiltre = await page.evaluate(
  () =>
    [...document.querySelectorAll("div")].filter(
      (d) => d.textContent?.trim() === "concert"
    ).length
);

// ---------------------------------------------------------------
// 4. Etat d'erreur : Supabase repond en echec.
//    On repond 503 plutot que d'annuler la requete : une requete annulee
//    laisse la promesse en attente et l'ecran reste sur les squelettes,
//    alors qu'une reponse en erreur suit vraiment le chemin catch de l'app.
// ---------------------------------------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

const pageErreur = await nouvelOnglet();
await pageErreur.setRequestInterception(true);
pageErreur.on("request", (req) => {
  if (!req.url().includes("supabase.co/rest")) {
    req.continue().catch(() => {});
    return;
  }
  // Le navigateur envoie d'abord un preflight OPTIONS. Sans en-tetes CORS
  // valides dessus, l'erreur remontee serait un opaque "Failed to fetch" ;
  // on laisse donc passer le preflight pour que l'app recoive le vrai 503.
  if (req.method() === "OPTIONS") {
    req.respond({ status: 204, headers: CORS }).catch(() => {});
    return;
  }
  req
    .respond({
      status: 503,
      contentType: "application/json",
      headers: CORS,
      body: JSON.stringify({ message: "service indisponible" }),
    })
    .catch(() => {});
});
await pageErreur.goto(BASE, { waitUntil: "domcontentloaded" });
// supabase-js reessaie plusieurs fois avant d'abandonner : il faut lui laisser
// le temps d'epuiser ses tentatives pour que l'ecran d'erreur s'affiche.
await sleep(14000);
await shot(pageErreur, "04-erreur");
const texteErreur = await pageErreur.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find(
    (d) => d.textContent?.trim() === "Chargement impossible"
  );
  return el ? el.parentElement?.textContent?.trim() : null;
});
await pageErreur.close();

await browser.close();

const preuves = {
  sousTitre,
  filtreClique: clique,
  cartesConcertApresFiltre: cartesApresFiltre,
  texteErreur,
  domainesContactes: [...domaines].sort(),
  supabaseContacte: [...domaines].some((d) => d.endsWith("supabase.co")),
  cdnAffichesContacte: [...domaines].some((d) => d.includes("cloudfront")),
};

writeFileSync(`${OUT}/preuves-lab8.json`, JSON.stringify(preuves, null, 2));
writeFileSync(
  new URL("./preuves-lab8.json", import.meta.url),
  JSON.stringify(preuves, null, 2)
);
console.log(preuves);
