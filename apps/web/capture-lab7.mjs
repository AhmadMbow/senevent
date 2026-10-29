// Lab 7 — Captures de non-regression. Le refactoring monorepo ne change AUCUN
// comportement visible : l'app web tourne exactement comme au Lab 6, mais toute
// la logique Supabase passe desormais par @senevent/shared. On le prouve en
// filmant le meme parcours et en observant que la donnee vient toujours de
// supabase.co, via le module transpile du package partage.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:5173";
const OUT = "/tmp/senevent-lab7-screens";
mkdirSync(OUT, { recursive: true });

const ID_EVENEMENT_A = 8; // evenement cree par le compte A au Lab 6
// Le mot de passe des comptes de test ne vit pas dans le depot (Lab 11).
const MDP = process.env.SENEVENT_MDP_TEST;
if (!MDP) {
  console.error("Definir SENEVENT_MDP_TEST (mot de passe des comptes de test).");
  process.exit(1);
}
const COMPTE_A = { email: "ahmadoussj+lab6a@gmail.com", pass: MDP };

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

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

// On observe les requetes reseau : la preuve que getEvenements() du package
// partage tape bien la vraie base, et non un mock.
const requetes = [];
page.on("request", r => {
  const u = r.url();
  if (u.includes("supabase.co") || u.includes("evenements.json")) requetes.push(u);
});

// --- 1. Le catalogue : getEvenements() depuis @senevent/shared -----------
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(1500);
await shot("01-catalogue");

// --- 2. Session reelle : seConnecter() du package partage ----------------
await page.goto(`${BASE}/auth`, { waitUntil: "networkidle0" });
await sleep(500);
await page.type('input[type="email"]', COMPTE_A.email);
await page.type('input[type="password"]', COMPTE_A.pass);
await page.click('button[type="submit"]');
await sleep(2500);
await shot("02-connecte");

// --- 3. Detail : jointure profiles + estInscrit() partages ---------------
await page.goto(`${BASE}/evenement/${ID_EVENEMENT_A}`, { waitUntil: "networkidle0" });
await sleep(1800);
await shot("03-detail", true);

// --- Preuve technique : le graphe de modules passe par @senevent/shared --
// On lit le module main.jsx tel que Vite le sert : l'import initSupabase
// pointe vers packages/shared, pas vers un fichier local.
const mainTransforme = await page.evaluate(async () => {
  const r = await fetch("/src/main.jsx");
  const txt = await r.text();
  const ligne = txt.split("\n").find(l => l.includes("initSupabase"));
  return ligne ? ligne.trim() : null;
});

const sourceDonnees = [...new Set(requetes)]
  .filter(u => u.includes("supabase.co"))
  .slice(0, 1)[0];

const preuves = {
  catalogueSource: sourceDonnees ?? null,
  mockJsonAppele: requetes.some(u => u.includes("evenements.json")),
  importPartage: mainTransforme,
  nbRequetesSupabase: requetes.filter(u => u.includes("supabase.co")).length,
};
writeFileSync(`${OUT}/preuves-lab7.json`, JSON.stringify(preuves, null, 2));
writeFileSync(
  new URL("./preuves-lab7.json", import.meta.url),
  JSON.stringify(preuves, null, 2)
);
console.log("PREUVES:", JSON.stringify(preuves, null, 2));

await browser.close();
console.log("DONE");
