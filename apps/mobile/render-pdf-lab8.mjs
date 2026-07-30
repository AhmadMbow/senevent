// Lab 8 — Impression du rapport HTML en PDF A4.
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SRC = "file:///tmp/senevent-lab8-screens/rapport-lab8.html";
const OUT =
  "/Users/babacarmbow/Desktop/Projets dev/senevent/Rapport-Lab8-SenEvent.pdf";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(SRC, { waitUntil: "networkidle0" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("wrote", OUT);
