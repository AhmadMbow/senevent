// Lab 10 — Impression du rapport HTML en PDF A4.
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const SRC = `file://${RACINE}/rapport-lab10.html`;
const OUT = `${RACINE}/Rapport-Lab10-SenEvent.pdf`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(encodeURI(SRC), { waitUntil: "networkidle0" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("wrote", OUT);
