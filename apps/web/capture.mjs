import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:5173";
const OUT = "/tmp/senevent-screens";
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,900"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

const shot = async name => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captured", name);
};

const goto = async path => {
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  await sleep(600);
};

// 1. Accueil (liste + NavBar)
await goto("/");
await shot("01-accueil");

// 2. Recherche / filtre
await page.type('input[type="search"]', "conf");
await sleep(500);
await shot("02-recherche");

// 3. Formulaire vide
await goto("/nouveau");
await shot("03-formulaire-vide");

// 4. Validation : soumettre vide
await page.click('button[type="submit"]');
await sleep(400);
await shot("04-validation-erreurs");

// 5. Formulaire rempli
await goto("/nouveau");
await page.type('input[type="text"]', "Concert de fin d'annee");
await page.select("select", "concert");
const inputs = await page.$$('input[type="text"]');
await inputs[1].type("Grand Theatre National");
const prix = await page.$('input[type="number"]');
await prix.click({ clickCount: 3 });
await prix.type("3000");
await sleep(300);
await shot("05-formulaire-rempli");

// 6. Soumission -> retour accueil, event en tete
await page.click('button[type="submit"]');
await sleep(800);
await shot("06-accueil-apres-ajout");

// 7. Detail d'un evenement
await goto("/evenement/1");
await shot("07-detail");

// 8. Page 404
await goto("/nimportequoi");
await shot("08-404");

await browser.close();
console.log("DONE");
