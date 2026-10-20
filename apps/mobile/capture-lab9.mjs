// Lab 9 — Captures et preuves de navigation pour le rapport.
//
// Comme au Lab 8, on pilote la MEME application sur la cible web d'Expo
// (react-native-web), dans une fenetre au format telephone. Avec Expo Router,
// le web a un avantage de plus : chaque ecran a une vraie URL, ce qui permet
// de verifier la navigation par le chemin (/, /profil, /evenement/3).
//
// Prerequis : `npx expo start --web --port 8090` doit tourner a cote.
// Les captures vont dans $CAPTURES_DIR (par defaut /tmp/senevent-lab9-screens).
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:8090";
const OUT = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab9-screens";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

const format = { width: 390, height: 844, deviceScaleFactor: 3 };

const domaines = new Set();
const erreursJs = [];
let requetesEvenements = 0;
// La reponse de Supabase telle que l'app l'a recue : c'est la reference pour
// verifier que l'ecran de detail affiche bien l'evenement de l'URL.
let evenementsRecus = [];

async function nouvelOnglet() {
  const page = await browser.newPage();
  await page.setViewport(format);
  page.on("request", (r) => {
    try {
      domaines.add(new URL(r.url()).hostname);
    } catch {}
  });
  page.on("response", async (r) => {
    const req = r.request();
    if (!r.url().includes("/rest/v1/evenements") || req.method() !== "GET") return;
    requetesEvenements += 1;
    try {
      evenementsRecus = await r.json();
    } catch {}
  });
  page.on("pageerror", (e) => erreursJs.push(e.message));
  return page;
}

const shot = async (page, nom) => {
  await page.screenshot({ path: `${OUT}/${nom}.png` });
  console.log("capture", nom);
};

const chemin = (page) => page.evaluate(() => location.pathname);
const texte = (page) => page.evaluate(() => document.body.innerText);

// Fleche retour du Stack : React Navigation l'etiquette "Retour, back".
const flechesVisibles = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[aria-label*="back" i]')].filter(
        (e) => e.offsetParent !== null
      ).length
  );

async function toucherFleche(page) {
  const h = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[aria-label*="back" i]')].find(
      (e) => e.offsetParent !== null
    )
  );
  await h.asElement().click();
  await sleep(1500);
}

// Le bouton du bonus. Le glyphe de l'icone Ionicons fait partie du texte,
// d'ou includes() ; on prend l'element le plus profond qui correspond.
async function toucherRetourListe(page) {
  const h = await page.evaluateHandle(() =>
    [...document.querySelectorAll("[tabindex]")]
      .reverse()
      .find(
        (e) => e.textContent.includes("Retour a la liste") && e.offsetParent !== null
      )
  );
  await h.asElement().click();
  await sleep(1500);
}

const preuves = {};

// ---------------------------------------------------------------
// 1. Onglet Evenements : la liste, avec la barre d'onglets en bas
// ---------------------------------------------------------------
const page = await nouvelOnglet();
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.waitForSelector('a[href^="/evenement/"]', { timeout: 20000 });
await sleep(2500);
await shot(page, "01-onglet-evenements");

const liens = await page.$$eval('a[href^="/evenement/"]', (as) =>
  as.map((a) => a.getAttribute("href"))
);
const onglets = await page.$$eval('a[role="tab"]', (as) =>
  as.map((a) => ({ href: a.getAttribute("href"), libelle: a.textContent.trim() }))
);
preuves.liste = {
  chemin: await chemin(page),
  cartes: liens.length,
  evenementsRecus: evenementsRecus.length,
  onglets,
};

// ---------------------------------------------------------------
// 2. Toucher une carte : le detail s'empile, l'URL porte l'id
// ---------------------------------------------------------------
const requetesAvantDetail = requetesEvenements;
const cible = liens[0];
await page.click(`a[href="${cible}"]`);
await page.waitForFunction((c) => location.pathname === c, {}, cible);
await sleep(2500);
await shot(page, "02-detail");

const idUrl = Number(cible.split("/").pop());
const attendu = evenementsRecus.find((ev) => ev.id === idUrl);
const texteDetail = await texte(page);
preuves.detail = {
  carteTouchee: cible,
  chemin: await chemin(page),
  titreAttendu: attendu?.titre ?? null,
  titreAffiche: attendu ? texteDetail.includes(attendu.titre) : false,
  lieuAffiche: attendu ? texteDetail.includes(attendu.lieu_nom) : false,
  enTeteDetail: texteDetail.trim().startsWith("Detail"),
  flecheRetour: await flechesVisibles(page),
  // L'ecran de detail rappelle getEvenements() : une requete de plus.
  requetesSupplementaires: requetesEvenements - requetesAvantDetail,
};

// ---------------------------------------------------------------
// 3. Fleche retour : on revient a la liste
// ---------------------------------------------------------------
await toucherFleche(page);
preuves.retour = { chemin: await chemin(page) };

// ---------------------------------------------------------------
// 4. Onglet Profil, puis retour sur l'onglet Evenements
// ---------------------------------------------------------------
await page.click('a[role="tab"][href="/profil"]');
await page.waitForFunction(() => location.pathname === "/profil");
await sleep(1200);
await shot(page, "03-onglet-profil");
preuves.profil = {
  chemin: await chemin(page),
  placeholder: (await texte(page)).includes("arriveront au Lab 10"),
};
const requetesAvantRetourOnglet = requetesEvenements;
await page.click('a[role="tab"][href="/"]');
await sleep(1200);
preuves.retourOnglet = {
  chemin: await chemin(page),
  // L'onglet a garde son etat : pas de rechargement de la liste.
  rechargementListe: requetesEvenements - requetesAvantRetourOnglet,
};

// ---------------------------------------------------------------
// 5. Bonus : "Retour a la liste" par code (useRouter + dismissTo)
// ---------------------------------------------------------------
await page.click(`a[href="${liens[1] ?? cible}"]`);
await sleep(2000);
const cheminAvantBonus = await chemin(page);
await toucherRetourListe(page);
preuves.bonus = {
  depuis: cheminAvantBonus,
  chemin: await chemin(page),
  // Aucune fleche retour visible : la liste n'a pas ete empilee une 2e fois.
  flechesApres: await flechesVisibles(page),
};
await page.close();

// ---------------------------------------------------------------
// 6. Lien direct vers un detail (ce que permet le scheme senevent://)
// ---------------------------------------------------------------
const dernier = liens[liens.length - 1];
const pageDirecte = await nouvelOnglet();
await pageDirecte.goto(BASE + dernier, { waitUntil: "networkidle0" });
await sleep(2500);
await shot(pageDirecte, "04-lien-direct");
const flecheDirecte = await flechesVisibles(pageDirecte);
await toucherFleche(pageDirecte);
preuves.lienDirect = {
  url: dernier,
  flecheRetour: flecheDirecte,
  cheminApresRetour: await chemin(pageDirecte),
};
await pageDirecte.close();

// ---------------------------------------------------------------
// 7. Identifiant inconnu
// ---------------------------------------------------------------
const pageInconnue = await nouvelOnglet();
await pageInconnue.goto(`${BASE}/evenement/999999`, { waitUntil: "networkidle0" });
await sleep(1500);
await shot(pageInconnue, "05-introuvable");
const texteInconnu = await texte(pageInconnue);
await toucherRetourListe(pageInconnue);
preuves.introuvable = {
  message: texteInconnu.includes("Evenement introuvable."),
  cheminApresBouton: await chemin(pageInconnue),
};
await pageInconnue.close();

await browser.close();

preuves.domainesContactes = [...domaines].sort();
preuves.supabaseContacte = preuves.domainesContactes.some((d) =>
  d.endsWith("supabase.co")
);
preuves.erreursJs = erreursJs;

writeFileSync(`${OUT}/preuves-lab9.json`, JSON.stringify(preuves, null, 2));
writeFileSync(
  new URL("./preuves-lab9.json", import.meta.url),
  JSON.stringify(preuves, null, 2)
);
console.log(JSON.stringify(preuves, null, 2));
