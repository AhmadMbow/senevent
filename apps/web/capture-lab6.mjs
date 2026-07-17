// Lab 6 — Captures d'ecran du parcours CRUD, prises sur la vraie base Supabase
// (sessions reelles, pas de mock). Necessite `npm run dev` sur le port 5173 et
// les comptes crees par setup-lab6.mjs.
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:5173";
const OUT = "/tmp/senevent-lab6-screens";
mkdirSync(OUT, { recursive: true });

const preuves = JSON.parse(
  readFileSync(new URL("./preuves-lab6.json", import.meta.url), "utf8")
);
const ID_EVENEMENT_A = preuves.insert.evenement.id;

const COMPTE_A = { email: "ahmadoussj+lab6a@gmail.com", pass: "motdepasse123" };
const COMPTE_B = { email: "ahmadoussj+lab6b@gmail.com", pass: "motdepasse123" };

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

// Les pages de detail depassent le viewport (l'affiche fait 700px de haut) :
// on les prend en pleine hauteur pour que les boutons restent visibles.
const shot = async (name, fullPage = false) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log("captured", name);
};

const clickText = async text => {
  const handle = await page.evaluateHandle(t => {
    const els = [...document.querySelectorAll("a, button")];
    return els.find(e => e.textContent.trim().includes(t));
  }, text);
  const el = handle.asElement();
  if (!el) throw new Error(`introuvable: ${text}`);
  await el.click();
};

const seConnecter = async compte => {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle0" });
  await sleep(500);
  await page.type('input[type="email"]', compte.email);
  await page.type('input[type="password"]', compte.pass);
  await page.click('button[type="submit"]');
  await sleep(2000);
};

const seDeconnecter = async () => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(600);
  await clickText("Se deconnecter");
  await sleep(1200);
};

// --- 1. Le catalogue vient de Supabase -----------------------------------
// On enregistre les requetes reseau pour prouver que la donnee vient de
// supabase.co et non plus de /evenements.json.
const requetes = [];
page.on("request", r => {
  const u = r.url();
  if (u.includes("supabase.co") || u.includes("evenements.json")) requetes.push(u);
});

await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(1500);
await shot("01-catalogue-supabase");

// --- 2. Session A : NavBar connectee -------------------------------------
await seConnecter(COMPTE_A);
await shot("02-connecte-navbar");

// --- 3. Formulaire avec champ fichier ------------------------------------
await page.goto(`${BASE}/nouveau`, { waitUntil: "networkidle0" });
await sleep(700);
await page.type('input[type="text"]', "Hackathon SenEvent");
await page.select("select", "conference");
const champs = await page.$$('input[type="text"]');
await champs[1].type("Amphi UCAD 2");
await shot("03-formulaire-insert");

// --- 4. Detail vu par l'organisateur : jointure + inscription + suppression
await page.goto(`${BASE}/evenement/${ID_EVENEMENT_A}`, { waitUntil: "networkidle0" });
await sleep(1500);
await shot("04-detail-organisateur", true);

// --- 5. Inscription : le bouton bascule ----------------------------------
await clickText("S'inscrire");
await sleep(1500);
await shot("05-inscrit-bascule", true);

// La bascule survit a un F5 : l'etat vient de la base, pas de React.
await page.reload({ waitUntil: "networkidle0" });
await sleep(1500);
await shot("06-inscrit-apres-f5", true);

// --- 6. Session B : pas de bouton Supprimer sur l'evenement de A ---------
await seDeconnecter();
await seConnecter(COMPTE_B);
await page.goto(`${BASE}/evenement/${ID_EVENEMENT_A}`, { waitUntil: "networkidle0" });
await sleep(1500);
await shot("07-detail-non-organisateur", true);

// --- 7. B force le DELETE depuis la console : RLS refuse -----------------
const resultatDelete = await page.evaluate(async id => {
  const mod = await import("/src/lib/supabase.js");
  const { data, error } = await mod.supabase
    .from("evenements")
    .delete()
    .eq("id", id)
    .select();
  const restant = await mod.supabase.from("evenements").select("id").eq("id", id);
  return {
    data,
    error,
    lignesSupprimees: data ? data.length : null,
    evenementToujoursLa: restant.data.length === 1,
  };
}, ID_EVENEMENT_A);
console.log("DELETE force depuis la console:", JSON.stringify(resultatDelete));

await browser.close();
console.log("\nrequetes observees:", [...new Set(requetes)].slice(0, 3));
console.log(
  "mock JSON appele ?",
  requetes.some(u => u.includes("evenements.json"))
);
console.log("DONE");
