import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:5173";
const OUT = "/tmp/senevent-lab5-screens";
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

// Clique un element par son texte visible.
const clickText = async text => {
  const handle = await page.evaluateHandle(t => {
    const els = [...document.querySelectorAll("a, button")];
    return els.find(e => e.textContent.trim().includes(t));
  }, text);
  const el = handle.asElement();
  if (!el) throw new Error(`introuvable: ${text}`);
  await el.click();
};

// On charge une seule fois puis on navigue en client-side (react-router),
// pour conserver l'etat du client mock (session en memoire JS).
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(700);
await shot("01-navbar-deconnecte");

// Vers l'ecran d'auth (mode login par defaut)
await clickText("Se connecter");
await sleep(600);
await shot("02-auth-login");

// Basculer en mode inscription (champ Nom d'affichage apparait)
await clickText("Pas encore de compte");
await sleep(500);
await shot("03-auth-signup");

// Remplir le formulaire d'inscription
const nom = await page.$('input[type="text"]');
await nom.type("Khady Ndiaye");
const email = await page.$('input[type="email"]');
await email.type("khady@senevent.sn");
const pass = await page.$('input[type="password"]');
await pass.type("motdepasse123");
await sleep(400);
await shot("04-auth-signup-rempli");

// Soumettre -> redirection vers / , navbar en mode connecte
await page.click('button[type="submit"]');
await sleep(800);
await shot("05-navbar-connecte");

// Se deconnecter (client-side), puis retenter un login avec de mauvais identifiants
await clickText("Se deconnecter");
await sleep(500);
await clickText("Se connecter");
await sleep(500);
const email2 = await page.$('input[type="email"]');
await email2.type("inconnu@senevent.sn");
const pass2 = await page.$('input[type="password"]');
await pass2.type("mauvaispass");
await page.click('button[type="submit"]');
await sleep(700);
await shot("06-auth-erreur");

await browser.close();
console.log("DONE");
