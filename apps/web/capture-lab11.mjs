// Lab 11 — Captures et preuves sur la production Vercel.
//
//   node capture-lab11.mjs avant   production sans vercel.json : le piege du 404
//   node capture-lab11.mjs apres   production avec la reecriture + recette
//
// La recette (phase apres) tourne au format telephone, reseau bride en
// "Fast 4G" par Chrome : c'est l'approximation automatisable de la recette
// depuis un telephone. La creation de compte avec confirmation d'email n'est
// pas automatisee (limite d'envoi du SMTP de Supabase) : elle reste manuelle.
//
// Prerequis (phase apres) : SENEVENT_MDP_TEST, le mot de passe des comptes de
// test, et `npx expo start --web --port 8090` dans apps/mobile pour la ligne 8.
// Les captures vont dans $CAPTURES_DIR (par defaut /tmp/senevent-lab11-screens).
import puppeteer, { PredefinedNetworkConditions } from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROD = "https://senevent-mbow.vercel.app";
const MOBILE = "http://localhost:8090";
const OUT = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab11-screens";
mkdirSync(OUT, { recursive: true });
const PHASE = process.argv[2];
if (!["avant", "apres"].includes(PHASE)) {
  console.error("Usage : node capture-lab11.mjs avant|apres");
  process.exit(1);
}

const COMPTE_A = { email: "ahmadoussj+lab6a@gmail.com", nom: "Atou Diop" };
const COMPTE_B = { email: "ahmadoussj+lab6b@gmail.com", nom: "Khady Ndiaye" };
const TITRE = "Recette Lab 11 (production)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const ordinateur = { width: 1280, height: 860, deviceScaleFactor: 1.5 };
const telephone = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const erreursJs = [];
async function onglet(viewport) {
  const contexte = await browser.createBrowserContext();
  const page = await contexte.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (e) => erreursJs.push(e.message));
  return page;
}
const shot = async (page, nom) => {
  await page.screenshot({ path: `${OUT}/${nom}.png` });
  console.log("capture", nom);
};
const texte = (page) => page.evaluate(() => document.body.innerText);
const attendreTexte = (page, t, timeout = 20000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, t);
const chemin = (page) => page.evaluate(() => location.pathname);

const fichierPreuves = new URL("./preuves-lab11.json", import.meta.url);
const preuves = existsSync(fichierPreuves) ? JSON.parse(readFileSync(fichierPreuves, "utf8")) : {};

// Statut HTTP brut, sans navigateur : ce que voit un lien colle sur WhatsApp.
async function statut(chemin) {
  const r = await fetch(PROD + chemin, { redirect: "manual" });
  return { statut: r.status, type: r.headers.get("content-type"), erreur: r.headers.get("x-vercel-error") };
}

if (PHASE === "avant") {
  // ---------------------------------------------------------------
  // Le piege : un clic marche, un rechargement casse
  // ---------------------------------------------------------------
  const page = await onglet(ordinateur);
  await page.goto(PROD, { waitUntil: "networkidle0" });
  await page.waitForSelector('a[href^="/evenement/"]');
  await shot(page, "01-prod-accueil");
  const href = await page.$eval('a[href^="/evenement/"]', (a) => a.getAttribute("href"));
  await page.click(`a[href="${href}"]`);
  await page.waitForFunction((h) => location.pathname === h, {}, href);
  await sleep(800);
  await shot(page, "02-prod-clic-detail");
  const titreClic = await page.$eval("h1", (h) => h.textContent);
  const reponse = await page.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  await shot(page, "03-prod-f5-404");
  preuves.avant = {
    date: new Date().toISOString(),
    accueil: await statut("/"),
    clic: { chemin: href, titre: titreClic },
    rechargement: { statut: reponse.status(), texte: (await texte(page)).split("\n").filter(Boolean).slice(0, 3) },
    lienDirect: await statut("/evenement/1"),
    nouveau: await statut("/nouveau"),
  };
}

if (PHASE === "apres") {
  const MDP = process.env.SENEVENT_MDP_TEST;
  if (!MDP) {
    console.error("Definir SENEVENT_MDP_TEST (mot de passe des comptes de test).");
    process.exit(1);
  }
  // Les cles publiques, lues dans le bundle de production lui-meme : c'est
  // exactement ce que n'importe quel visiteur peut faire.
  const html = await (await fetch(PROD)).text();
  const js = await (await fetch(PROD + html.match(/\/assets\/index-[\w-]+\.js/)[0])).text();
  const URL_SUPABASE = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)[0];
  const ANON = js.match(/sb_publishable_[\w-]+/)[0];
  const api = (chemin, options = {}) =>
    fetch(URL_SUPABASE + chemin, {
      ...options,
      headers: { apikey: ANON, "Content-Type": "application/json", ...(options.headers ?? {}) },
    });
  const jeton = async (email) =>
    (await (await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password: MDP }) })).json()).access_token;

  // ---------------------------------------------------------------
  // La correction : la reecriture renvoie index.html
  // ---------------------------------------------------------------
  const page = await onglet(ordinateur);
  await page.goto(PROD, { waitUntil: "networkidle0" });
  const href = await page.$eval('a[href^="/evenement/"]', (a) => a.getAttribute("href"));
  await page.click(`a[href="${href}"]`);
  await page.waitForFunction((h) => location.pathname === h, {}, href);
  const reponse = await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  await shot(page, "04-prod-f5-ok");
  const vraiFichier = html.match(/\/assets\/index-[\w-]+\.js/)[0];
  preuves.apres = {
    date: new Date().toISOString(),
    rechargement: { chemin: href, statut: reponse.status(), titre: await page.$eval("h1", (h) => h.textContent), url: await chemin(page) },
    lienDirect: await statut("/evenement/1"),
    nouveau: await statut("/nouveau"),
    vraiFichier: { chemin: vraiFichier, ...(await statut(vraiFichier)) },
    fichierAbsent: await statut("/assets/inexistant.js"),
  };
  await page.close();

  // ---------------------------------------------------------------
  // La recette, au format telephone et en "Fast 4G"
  // ---------------------------------------------------------------
  const recette = {};
  const tel = await onglet(telephone);
  await tel.emulateNetworkConditions(PredefinedNetworkConditions["Fast 4G"]);

  // 1. Ouvrir l'adresse de production
  let t0 = Date.now();
  await tel.goto(PROD, { waitUntil: "domcontentloaded" });
  await tel.waitForSelector('a[href^="/evenement/"]', { timeout: 30000 });
  recette.r1 = { secondes: (Date.now() - t0) / 1000, compteur: (await texte(tel)).match(/\d+ evenement\(s\) trouve\(s\)/)?.[0] };
  await shot(tel, "05-recette-accueil-4g");

  // 2. Ouvrir un evenement, appuyer sur F5
  await tel.click(`a[href="${href}"]`);
  await tel.waitForFunction((h) => location.pathname === h, {}, href);
  const titreAvantF5 = await tel.$eval("h1", (h) => h.textContent);
  const f5 = await tel.reload({ waitUntil: "networkidle0" });
  await tel.waitForSelector("h1");
  recette.r2 = { statut: f5.status(), memeFiche: (await tel.$eval("h1", (h) => h.textContent)) === titreAvantF5 };

  // 3. Coller l'URL d'une fiche dans un nouvel onglet
  const tel3 = await onglet(telephone);
  await tel3.emulateNetworkConditions(PredefinedNetworkConditions["Fast 4G"]);
  const r3 = await tel3.goto(`${PROD}${href}`, { waitUntil: "networkidle0" });
  await tel3.waitForSelector("h1");
  recette.r3 = { statut: r3.status(), titre: await tel3.$eval("h1", (h) => h.textContent) };
  await shot(tel3, "06-recette-lien-direct");
  await tel3.close();

  // 5. Se connecter, creer un evenement
  await tel.goto(`${PROD}/auth`, { waitUntil: "networkidle0" });
  await tel.type('input[type="email"]', COMPTE_A.email);
  await tel.type('input[type="password"]', MDP);
  await tel.click('button[type="submit"]');
  await attendreTexte(tel, COMPTE_A.email);
  await tel.goto(`${PROD}/nouveau`, { waitUntil: "networkidle0" });
  const champs = await tel.$$('input[type="text"]');
  await champs[0].type(TITRE);
  await tel.select("select", "conference");
  await champs[1].type("Amphi UCAD 2");
  await tel.click('button[type="submit"]');
  await tel.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  await attendreTexte(tel, TITRE);
  const evenements = await (await api("/rest/v1/evenements?select=id,titre,organisateur_id")).json();
  const ev = evenements.find((e) => e.titre === TITRE);
  recette.r5 = { dansLaListe: true, id: ev.id };

  // 6. Recharger la page
  await tel.reload({ waitUntil: "networkidle0" });
  await attendreTexte(tel, TITRE);
  recette.r6 = { toujoursLa: true };
  await tel.$eval(`a[href="/evenement/${ev.id}"]`, (a) => a.scrollIntoView({ block: "center" }));
  await sleep(500);
  await shot(tel, "07-recette-evenement-cree");

  // 7. S'inscrire a un evenement
  await tel.goto(`${PROD}/evenement/${ev.id}`, { waitUntil: "networkidle0" });
  const boutonInscrire = await tel.waitForFunction(
    () => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "S'inscrire"),
    { timeout: 15000 }
  );
  await boutonInscrire.asElement().click();
  await attendreTexte(tel, "Se desinscrire");
  recette.r7 = { bouton: "Se desinscrire" };
  await shot(tel, "08-recette-inscription");

  // 8. L'app mobile voit l'evenement cree en production
  const mobile = await onglet({ width: 390, height: 844, deviceScaleFactor: 2 });
  try {
    await mobile.goto(MOBILE, { waitUntil: "networkidle0", timeout: 60000 });
    await mobile.waitForSelector('a[href^="/evenement/"]', { timeout: 30000 });
    // La FlatList virtualise : on fait defiler jusqu'a la carte.
    for (let i = 0; i < 25 && !(await mobile.$(`a[href="/evenement/${ev.id}"]`)); i++) {
      await mobile.evaluate(() => {
        const zone = [...document.querySelectorAll("div")].find(
          (d) => d.scrollHeight > d.clientHeight + 50 && ["auto", "scroll"].includes(getComputedStyle(d).overflowY) && d.querySelector('a[href^="/evenement/"]')
        );
        if (zone) zone.scrollTop += 600;
      });
      await sleep(300);
    }
    await mobile.$eval(`a[href="/evenement/${ev.id}"]`, (a) => a.scrollIntoView({ block: "center" }));
    await sleep(800);
    await shot(mobile, "09-recette-mobile");
    recette.r8 = { visibleSurMobile: (await texte(mobile)).includes(TITRE) };
  } catch (e) {
    recette.r8 = { visibleSurMobile: false, erreur: e.message };
  }

  // 9. Avec un autre compte, tenter de supprimer cet evenement
  const tel9 = await onglet(telephone);
  await tel9.goto(`${PROD}/auth`, { waitUntil: "networkidle0" });
  await tel9.type('input[type="email"]', COMPTE_B.email);
  await tel9.type('input[type="password"]', MDP);
  await tel9.click('button[type="submit"]');
  await attendreTexte(tel9, COMPTE_B.email);
  await tel9.goto(`${PROD}/evenement/${ev.id}`, { waitUntil: "networkidle0" });
  await tel9.waitForSelector("h1");
  const boutonSupprimer = (await texte(tel9)).includes("Supprimer cet evenement");
  await shot(tel9, "10-recette-autre-compte");
  // Le DELETE force, avec le jeton de Khady : la RLS ne touche aucune ligne.
  const force = await api(`/rest/v1/evenements?id=eq.${ev.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await jeton(COMPTE_B.email)}`, Prefer: "return=representation" },
  });
  const supprimees = (await force.json()).length;
  const encoreLa = (await (await api(`/rest/v1/evenements?select=id&id=eq.${ev.id}`)).json()).length;
  recette.r9 = { boutonSupprimer, statutDeleteForce: force.status, lignesSupprimees: supprimees, evenementEncoreLa: encoreLa === 1 };

  // 10. Chercher "service_role" dans le code de la page
  const sources = await tel.evaluate(async () => {
    const urls = [location.href, ...[...document.scripts].map((s) => s.src).filter(Boolean), ...[...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href)];
    let tout = "";
    for (const u of urls) tout += await (await fetch(u)).text();
    return { fichiers: urls.length, serviceRole: tout.includes("service_role"), clePublique: /sb_publishable_/.test(tout) };
  });
  recette.r10 = sources;

  // Nettoyage : Atou supprime son evenement (l'inscription part avec).
  const nettoyage = await api(`/rest/v1/evenements?id=eq.${ev.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${await jeton(COMPTE_A.email)}`, Prefer: "return=representation" },
  });
  recette.nettoyage = { lignesSupprimees: (await nettoyage.json()).length };
  preuves.recette = recette;
}

await browser.close();
preuves[`erreursJs_${PHASE}`] = erreursJs;
writeFileSync(fichierPreuves, JSON.stringify(preuves, null, 2));
writeFileSync(`${OUT}/preuves-lab11.json`, JSON.stringify(preuves, null, 2));
console.log(JSON.stringify(preuves, null, 2));
