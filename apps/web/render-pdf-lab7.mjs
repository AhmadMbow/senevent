import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SRC = "file:///tmp/senevent-lab7-screens/rapport-lab7.html";
const OUT = "/Users/babacarmbow/Desktop/Projets dev/senevent/Rapport-Lab7-SenEvent.pdf";

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
