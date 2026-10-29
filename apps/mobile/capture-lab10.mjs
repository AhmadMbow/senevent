// Lab 10 — Captures et preuves du parcours auth + CRUD mobile, et de la demo
// croisee web <-> mobile, sur la vraie base Supabase.
//
// Comme aux Labs 8 et 9, l'app mobile est pilotee sur la cible web d'Expo
// (react-native-web) au format telephone. L'app web du Lab 6 tourne a cote :
// les deux clients parlent a la meme base, avec les comptes de test du Lab 6.
//
// Prerequis :
//   - `npx expo start --web --port 8090` dans apps/mobile
//   - `npm run dev` dans apps/web (port 5173)
//   - LAB10_MDP : le mot de passe des deux comptes de test (jamais dans Git)
// Les captures vont dans $CAPTURES_DIR (par defaut /tmp/senevent-lab10-screens).
// Les deux evenements crees pendant le parcours sont supprimes a la fin.
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MOBILE = "http://localhost:8090";
const WEB = "http://localhost:5173";
const OUT = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab10-screens";
mkdirSync(OUT, { recursive: true });

const MDP = process.env.LAB10_MDP;
if (!MDP) {
  console.error("Definir LAB10_MDP (mot de passe des comptes de test du Lab 6).");
  process.exit(1);
}
const COMPTE_A = { email: "ahmadoussj+lab6a@gmail.com", nom: "Atou Diop" };
const COMPTE_B = { email: "ahmadoussj+lab6b@gmail.com", nom: "Khady Ndiaye" };

const TITRE_MOBILE = "Concert test mobile (Lab 10)";
const TITRE_WEB = "Concert test (web, Lab 10)";

// Les cles publiques du projet, pour verifier la base et nettoyer a la fin.
const env = Object.fromEntries(
  readFileSync(new URL("./.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_SUPABASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Attendre qu'une condition cote Node devienne vraie (ex. : la derniere
// reponse /evenements contient un titre, meme si la carte n'est pas encore
// dessinee par la FlatList).
async function attendre(condition, timeout = 15000) {
  const fin = Date.now() + timeout;
  while (Date.now() < fin) {
    const v = condition();
    if (v) return v;
    await sleep(200);
  }
  throw new Error("delai depasse");
}

// Connexion par l'API d'auth, hors de l'app : sert a verifier la base et a
// nettoyer a la fin avec les droits de chaque organisateur.
async function connexionApi(email) {
  const r = await fetch(`${URL_SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: MDP }),
  });
  return r.json();
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

const domaines = new Set();
const erreursJs = [];
// Journal des appels REST et auth, pour compter et verifier les statuts.
const journal = [];
let evenementsRecus = [];

async function nouvelOnglet(client, viewport) {
  const contexte = await browser.createBrowserContext();
  const page = await contexte.newPage();
  await page.setViewport(viewport);
  page.on("request", (r) => {
    try {
      domaines.add(new URL(r.url()).hostname);
    } catch {}
  });
  page.on("response", async (r) => {
    const req = r.request();
    if (req.method() === "OPTIONS") return;
    const m = r.url().match(/\/(rest|auth)\/v1\/([a-z_]+)/);
    if (!m) return;
    journal.push({ client, methode: req.method(), ressource: m[2], statut: r.status() });
    if (client === "mobile" && m[2] === "evenements" && req.method() === "GET") {
      try {
        evenementsRecus = await r.json();
      } catch {}
    }
  });
  page.on("pageerror", (e) => erreursJs.push(`${client}: ${e.message}`));
  return page;
}

const compter = (filtre) =>
  journal.filter((j) => Object.entries(filtre).every(([k, v]) => j[k] === v)).length;

const shot = async (page, nom, fullPage = false) => {
  await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage });
  console.log("capture", nom);
};

const chemin = (page) => page.evaluate(() => location.pathname);
const texte = (page) => page.evaluate(() => document.body.innerText);
const attendreTexte = (page, t, timeout = 15000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, t);

// Toucher un Pressable par son libelle. Le glyphe Ionicons fait partie du
// texte (zone Unicode privee) : on le retire avant de comparer, et on prend
// l'element le plus profond qui correspond.
async function toucher(page, libelle, { exact = false } = {}) {
  const h = await page.evaluateHandle(
    (libelle, exact) =>
      [...document.querySelectorAll("[tabindex], a, button")].reverse().find((e) => {
        if (e.offsetParent === null) return false;
        const t = e.textContent.replace(/[-]/g, "").trim();
        return exact ? t === libelle : t.includes(libelle);
      }),
    libelle,
    exact
  );
  const el = h.asElement();
  if (!el) throw new Error(`introuvable : ${libelle}`);
  await el.click();
}

// La FlatList virtualise : on la fait defiler jusqu'a la carte voulue.
async function montrerCarte(page, id) {
  const selecteur = `a[href="/evenement/${id}"]`;
  for (let i = 0; i < 20 && !(await page.$(selecteur)); i++) {
    await page.evaluate(() => {
      const zone = [...document.querySelectorAll("div")].find(
        (d) =>
          d.scrollHeight > d.clientHeight + 50 &&
          ["auto", "scroll"].includes(getComputedStyle(d).overflowY) &&
          d.querySelector('a[href^="/evenement/"]')
      );
      if (zone) zone.scrollTop += 600;
    });
    await sleep(300);
  }
  await page.$eval(selecteur, (a) => a.scrollIntoView({ block: "center" }));
  await sleep(800);
}

// Faire defiler l'ecran jusqu'a un libelle avant une capture.
async function montrerTexte(page, libelle) {
  await page.evaluate((libelle) => {
    const el = [...document.querySelectorAll("div")]
      .reverse()
      .find((e) => e.textContent.includes(libelle) && e.offsetParent !== null);
    el?.scrollIntoView({ block: "center" });
  }, libelle);
  await sleep(600);
}

const ongletMobile = (page, href) => page.click(`a[role="tab"][href="${href}"]`);

async function connexionMobile(page, email, mdp) {
  await page.type('input[placeholder="Email"]', email);
  await page.type('input[placeholder="Mot de passe"]', mdp);
  await toucher(page, "Se connecter", { exact: true });
}

async function connexionWeb(page, compte) {
  await page.goto(`${WEB}/auth`, { waitUntil: "networkidle0" });
  await page.type('input[type="email"]', compte.email);
  await page.type('input[type="password"]', MDP);
  await page.click('button[type="submit"]');
  await attendreTexte(page, compte.email);
}

const preuves = {};
const telephone = { width: 390, height: 844, deviceScaleFactor: 2 };
const ordinateur = { width: 1280, height: 860, deviceScaleFactor: 1.5 };

// ---------------------------------------------------------------
// 1. Deconnecte : pas de bouton "+", formulaire dans l'onglet Profil
// ---------------------------------------------------------------
const mobile = await nouvelOnglet("mobile", telephone);
await mobile.goto(MOBILE, { waitUntil: "networkidle0" });
await mobile.waitForSelector('a[href^="/evenement/"]', { timeout: 30000 });
await sleep(2000);
await shot(mobile, "01-liste-deconnecte");
preuves.deconnecte = {
  cartes: evenementsRecus.length,
  boutonPlus: (await mobile.$('[aria-label="Nouvel evenement"]')) !== null,
};

await ongletMobile(mobile, "/profil");
await attendreTexte(mobile, "Pas de compte");
await sleep(600);
await shot(mobile, "02-profil-formulaire");
preuves.formulaire = {
  champs: await mobile.$$eval("input", (is) => is.map((i) => i.placeholder)),
  motDePasseMasque: await mobile.$eval('input[placeholder="Mot de passe"]', (i) => i.type),
};

// ---------------------------------------------------------------
// 2. Mode inscription : la validation locale arrete un mot de passe court
//    avant tout appel a Supabase (aucun compte cree, aucun email envoye)
// ---------------------------------------------------------------
await toucher(mobile, "Pas de compte ? En creer un");
await mobile.waitForSelector('input[placeholder="Nom d\'affichage"]');
await mobile.type('input[placeholder="Nom d\'affichage"]', "Compte de test");
await mobile.type('input[placeholder="Email"]', "test.lab10@example.com");
await mobile.type('input[placeholder="Mot de passe"]', "123");
await toucher(mobile, "Creer le compte", { exact: true });
await sleep(800);
await shot(mobile, "03-inscription-validation");
preuves.inscriptionCompte = {
  champs: await mobile.$$eval("input", (is) => is.map((i) => i.placeholder)),
  message: (await texte(mobile)).includes("au moins 6 caracteres"),
  appelsSignup: compter({ ressource: "signup" }),
};

// ---------------------------------------------------------------
// 3. Connexion : mauvais mot de passe, puis le bon
// ---------------------------------------------------------------
await toucher(mobile, "Deja un compte ? Se connecter");
await sleep(400);
for (const sel of ['input[placeholder="Email"]', 'input[placeholder="Mot de passe"]']) {
  await mobile.click(sel, { clickCount: 3 });
  await mobile.keyboard.press("Backspace");
}
await connexionMobile(mobile, COMPTE_A.email, "mauvais-mot-de-passe");
await attendreTexte(mobile, "Invalid login credentials");
await shot(mobile, "04-connexion-erreur");
preuves.mauvaisMotDePasse = {
  message: "Invalid login credentials",
  statut: journal.filter((j) => j.ressource === "token").at(-1)?.statut,
};

await mobile.click('input[placeholder="Mot de passe"]', { clickCount: 3 });
await mobile.keyboard.press("Backspace");
await mobile.type('input[placeholder="Mot de passe"]', MDP);
await mobile.keyboard.press("Enter"); // onSubmitEditing du champ mot de passe
await attendreTexte(mobile, "Se deconnecter");
await sleep(1500);
await shot(mobile, "05-profil-connecte");
const texteProfil = await texte(mobile);
const inscriptionsAvant = Number(texteProfil.match(/MES INSCRIPTIONS · (\d+)/i)?.[1] ?? NaN);
preuves.connexion = {
  statut: journal.filter((j) => j.ressource === "token").at(-1)?.statut,
  nomAffiche: texteProfil.includes(COMPTE_A.nom),
  emailAffiche: texteProfil.includes(COMPTE_A.email),
  formulaireRemplace: !texteProfil.includes("Mot de passe"),
  inscriptionsAvant,
};

// ---------------------------------------------------------------
// 4. Connecte : le "+" apparait, la liste se recharge au focus
// ---------------------------------------------------------------
const getAvantFocus = compter({ client: "mobile", ressource: "evenements", methode: "GET" });
await ongletMobile(mobile, "/");
await mobile.waitForSelector('[aria-label="Nouvel evenement"]', { timeout: 10000 });
await sleep(1200);
await shot(mobile, "06-liste-connecte");
preuves.connecte = {
  boutonPlus: (await mobile.$('[aria-label="Nouvel evenement"]')) !== null,
  rechargementAuFocus:
    compter({ client: "mobile", ressource: "evenements", methode: "GET" }) - getAvantFocus,
};
const nombreAvant = evenementsRecus.length;

// ---------------------------------------------------------------
// 5. Creation depuis le mobile
// ---------------------------------------------------------------
await mobile.click('[aria-label="Nouvel evenement"]');
await mobile.waitForFunction(() => location.pathname === "/nouveau");
await sleep(1000);
const postsAvant = compter({ client: "mobile", ressource: "evenements", methode: "POST" });
await toucher(mobile, "Ajouter l'evenement");
await sleep(600);
await shot(mobile, "07-nouveau-validation");
const texteValidation = await texte(mobile);
preuves.validationCreation = {
  chemin: await chemin(mobile),
  titre: texteValidation.includes("au moins 3 caracteres"),
  lieu: texteValidation.includes("Le lieu est requis"),
  requetesEnvoyees: compter({ client: "mobile", ressource: "evenements", methode: "POST" }) - postsAvant,
};

const champs = await mobile.$$("input");
await champs[0].type(TITRE_MOBILE);
await toucher(mobile, "expo", { exact: true });
await toucher(mobile, "concert", { exact: true }); // on change d'avis : la puce suit
await champs[1].type("Place du Souvenir africain, Dakar");
await champs[2].type("2500");
await sleep(500);
await shot(mobile, "08-nouveau-rempli");

await toucher(mobile, "Ajouter l'evenement");
await mobile.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
const evMobile = await attendre(() => evenementsRecus.find((e) => e.titre === TITRE_MOBILE));
await sleep(1500);
await montrerCarte(mobile, evMobile.id);
await shot(mobile, "09-liste-apres-creation");
preuves.creation = {
  statutInsert: journal.filter((j) => j.client === "mobile" && j.ressource === "evenements" && j.methode === "POST").at(-1)?.statut,
  cheminApres: await chemin(mobile),
  nombreAvant,
  nombreApres: evenementsRecus.length,
  id: evMobile.id,
  categorie: evMobile.categorie,
  prix: evMobile.prix,
  organisateur: evMobile.profiles?.nom ?? null,
  carteVisible: (await texte(mobile)).includes(TITRE_MOBILE),
};

// ---------------------------------------------------------------
// 6. Demo croisee, sens mobile -> web
// ---------------------------------------------------------------
const web = await nouvelOnglet("web", ordinateur);
await web.goto(WEB, { waitUntil: "networkidle0" });
await attendreTexte(web, TITRE_MOBILE);
await web.$eval(`a[href="/evenement/${evMobile.id}"]`, (a) => a.scrollIntoView({ block: "center" }));
await sleep(600);
await shot(web, "10-web-liste-evenement-mobile");
await web.goto(`${WEB}/evenement/${evMobile.id}`, { waitUntil: "networkidle0" });
await sleep(800);
await shot(web, "11-web-detail-evenement-mobile");
const texteWebDetail = await texte(web);
preuves.webVoitMobile = {
  dansLaListe: true,
  organisateur: texteWebDetail.includes(COMPTE_A.nom),
  imageCassee: await web.$$eval("img", (is) => is.some((i) => i.complete && i.naturalWidth === 0)),
};

// ---------------------------------------------------------------
// 7. Demo croisee, sens web -> mobile : Khady cree sur le web, Atou
//    le voit et s'y inscrit depuis le mobile
// ---------------------------------------------------------------
await connexionWeb(web, COMPTE_B);
await web.goto(`${WEB}/nouveau`, { waitUntil: "networkidle0" });
const champsWeb = await web.$$('input[type="text"]');
await champsWeb[0].type(TITRE_WEB);
await web.select("select", "concert");
await champsWeb[1].type("Institut francais, Dakar");
await web.click('button[type="submit"]');
await web.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
await attendreTexte(web, TITRE_WEB);
preuves.webCree = {
  statutInsert: journal.filter((j) => j.client === "web" && j.ressource === "evenements" && j.methode === "POST").at(-1)?.statut,
};

// Le mobile n'a rien demande : il suffit de revenir sur la liste.
const getAvantRetour = compter({ client: "mobile", ressource: "evenements", methode: "GET" });
await ongletMobile(mobile, "/profil");
await sleep(800);
await ongletMobile(mobile, "/");
const evWeb = await attendre(() => evenementsRecus.find((e) => e.titre === TITRE_WEB));
await sleep(1500);
await montrerCarte(mobile, evWeb.id);
await shot(mobile, "12-mobile-voit-evenement-web");
preuves.mobileVoitWeb = {
  rechargements: compter({ client: "mobile", ressource: "evenements", methode: "GET" }) - getAvantRetour,
  id: evWeb.id,
  organisateur: evWeb.profiles?.nom ?? null,
};

await mobile.click(`a[href="/evenement/${evWeb.id}"]`);
await attendreTexte(mobile, "S'inscrire a cet evenement");
await toucher(mobile, "S'inscrire a cet evenement");
await attendreTexte(mobile, "Se desinscrire");
await montrerTexte(mobile, "Vous etes inscrit");
await shot(mobile, "13-mobile-inscription");

// La ligne est-elle vraiment en base ? Lecture publique (policy
// inscriptions_select_public), sans passer par l'app.
const enBase = await fetch(
  `${URL_SUPABASE}/rest/v1/inscriptions?select=utilisateur_id&evenement_id=eq.${evWeb.id}`,
  { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
).then((r) => r.json());
const idA = (await connexionApi(COMPTE_A.email)).user.id;
preuves.inscription = {
  statutInsert: journal.filter((j) => j.client === "mobile" && j.ressource === "inscriptions" && j.methode === "POST").at(-1)?.statut,
  lignesEnBase: enBase.length,
  ligneDuCompteA: enBase.some((l) => l.utilisateur_id === idA),
};

// Sur le web, Atou retrouve son inscription faite depuis le telephone.
await toucher(web, "Se deconnecter");
await sleep(1000);
await connexionWeb(web, COMPTE_A);
await web.goto(`${WEB}/evenement/${evWeb.id}`, { waitUntil: "networkidle0" });
await attendreTexte(web, "Se desinscrire");
await shot(web, "14-web-voit-inscription");
preuves.webVoitInscription = { bouton: "Se desinscrire" };

// ---------------------------------------------------------------
// 8. Bonus : Mes inscriptions dans le profil
// ---------------------------------------------------------------
await mobile.goBack();
await sleep(1200);
await ongletMobile(mobile, "/profil");
await attendreTexte(mobile, TITRE_WEB);
await sleep(800);
await shot(mobile, "15-profil-mes-inscriptions");
const texteBonus = await texte(mobile);
preuves.bonus = {
  inscriptionsAvant,
  inscriptionsApres: Number(texteBonus.match(/MES INSCRIPTIONS · (\d+)/i)?.[1] ?? NaN),
  contientEvenementWeb: texteBonus.includes(TITRE_WEB),
};

// ---------------------------------------------------------------
// 9. Deconnexion : retour au formulaire, plus de "+", detail verrouille
// ---------------------------------------------------------------
await toucher(mobile, "Se deconnecter");
await attendreTexte(mobile, "Pas de compte");
const formulaireRevenu = true;
await ongletMobile(mobile, "/");
await sleep(1200);
const plusApresDeco = (await mobile.$('[aria-label="Nouvel evenement"]')) !== null;
await montrerCarte(mobile, evMobile.id);
await mobile.click(`a[href="/evenement/${evMobile.id}"]`);
await attendreTexte(mobile, "Connectez-vous (onglet Profil)");
await montrerTexte(mobile, "Connectez-vous (onglet Profil)");
await shot(mobile, "16-detail-deconnecte");
preuves.deconnexion = {
  statut: journal.filter((j) => j.ressource === "logout").at(-1)?.statut,
  formulaireRevenu,
  boutonPlus: plusApresDeco,
  detailInvite: (await texte(mobile)).includes("Connectez-vous (onglet Profil)"),
};

// Le lien direct vers /nouveau, deconnecte : l'ecran refuse poliment.
await mobile.goto(`${MOBILE}/nouveau`, { waitUntil: "networkidle0" });
await attendreTexte(mobile, "Connexion requise");
await sleep(500);
await shot(mobile, "17-nouveau-deconnecte");
await toucher(mobile, "Aller au profil");
await sleep(1200);
preuves.gardeNouveau = { cheminApresBouton: await chemin(mobile) };

await browser.close();

// ---------------------------------------------------------------
// 10. Nettoyage : chaque organisateur supprime son evenement de test.
//     Les inscriptions partent avec (on delete cascade du Lab 5).
// ---------------------------------------------------------------
async function supprimer(id, email) {
  const r = await fetch(`${URL_SUPABASE}/rest/v1/evenements?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${(await connexionApi(email)).access_token}`,
      Prefer: "return=representation",
    },
  });
  return (await r.json()).length;
}
preuves.nettoyage = {
  evenementMobile: await supprimer(evMobile.id, COMPTE_A.email),
  evenementWeb: await supprimer(evWeb.id, COMPTE_B.email),
};

preuves.domainesContactes = [...domaines].sort();
preuves.supabaseContacte = preuves.domainesContactes.some((d) => d.endsWith("supabase.co"));
preuves.erreursJs = erreursJs;

writeFileSync(`${OUT}/preuves-lab10.json`, JSON.stringify(preuves, null, 2));
writeFileSync(new URL("./preuves-lab10.json", import.meta.url), JSON.stringify(preuves, null, 2));
console.log(JSON.stringify(preuves, null, 2));
