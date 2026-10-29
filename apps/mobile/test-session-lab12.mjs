// Lab 12 — La session survit-elle a un redemarrage de l'app ?
//
// Comme React Native, Node n'a pas de localStorage : sans stockage fourni,
// supabase-js garde la session en memoire. On le verifie avec le vrai package
// partage, dans deux processus Node separes : le premier se connecte, le
// second (tout neuf, comme une app rouverte) relit la session.
//   - sans option : l'appel initSupabase(url, key) du Lab 10 ;
//   - avec option : l'appel du Lab 12, avec un stockage asynchrone persistant
//     qui joue le role d'AsyncStorage (memes trois methodes, ecrites sur disque).
//
// Prerequis : SENEVENT_MDP_TEST, le mot de passe des comptes de test.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "../..");
const EMAIL = "ahmadoussj+lab6a@gmail.com";

const [, , role, stockage, dossier] = process.argv;

// ---------------------------------------------------------------
// Processus enfant : une "ouverture" de l'application
// ---------------------------------------------------------------
if (role === "connexion" || role === "redemarrage") {
  const env = Object.fromEntries(
    readFileSync(path.join(ICI, ".env"), "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
  // supabase-js prepare son client temps reel des la creation et exige un
  // WebSocket, absent de Node 20. Le test n'ouvre aucun canal temps reel.
  globalThis.WebSocket ??= class WebSocketNonUtilise {};
  const { initSupabase, seConnecter, getSession } = createRequire(import.meta.url)(
    path.join(dossier, "shared.cjs")
  );

  const fichier = path.join(dossier, "stockage.json");
  const lire = () => (existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : {});
  const AsyncStorageDisque = {
    getItem: async (cle) => lire()[cle] ?? null,
    setItem: async (cle, valeur) => writeFileSync(fichier, JSON.stringify({ ...lire(), [cle]: valeur })),
    removeItem: async (cle) => {
      const d = lire();
      delete d[cle];
      writeFileSync(fichier, JSON.stringify(d));
    },
  };

  // Les memes options que apps/mobile/app/_layout.js.
  const options =
    stockage === "asyncstorage"
      ? { auth: { storage: AsyncStorageDisque, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
      : undefined;
  initSupabase(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, options);

  if (role === "connexion") {
    const { user } = await seConnecter(EMAIL, process.env.SENEVENT_MDP_TEST);
    console.log(JSON.stringify({ connecte: user.email, clesStockees: Object.keys(lire()) }));
  } else {
    const session = await getSession();
    console.log(JSON.stringify({ sessionRetrouvee: session?.user.email ?? null }));
  }
  process.exit(0); // autoRefreshToken arme un minuteur : on ferme l'"app"
}

// ---------------------------------------------------------------
// Processus parent : deux scenarios, deux redemarrages
// ---------------------------------------------------------------
if (!process.env.SENEVENT_MDP_TEST) {
  console.error("Definir SENEVENT_MDP_TEST (mot de passe des comptes de test).");
  process.exit(1);
}
const travail = mkdtempSync(path.join(tmpdir(), "senevent-session-"));
// Le package partage est en TypeScript : esbuild le regroupe pour Node.
execFileSync(
  path.join(RACINE, "node_modules/.bin/esbuild"),
  [path.join(RACINE, "packages/shared/src/index.ts"), "--bundle", "--platform=node", "--format=cjs", `--outfile=${path.join(travail, "shared.cjs")}`, "--log-level=warning"]
);

const ouvrir = (role, stockage) =>
  JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), role, stockage, travail], { env: process.env, encoding: "utf8" }));

const resultats = {};
for (const stockage of ["aucun", "asyncstorage"]) {
  const connexion = ouvrir("connexion", stockage);
  const redemarrage = ouvrir("redemarrage", stockage);
  resultats[stockage] = { ...connexion, ...redemarrage };
}
resultats.webInchange = {
  // Le web appelle toujours initSupabase avec deux arguments.
  appelWeb: readFileSync(path.join(RACINE, "apps/web/src/main.jsx"), "utf8").match(/initSupabase\([\s\S]*?\);/)[0].replace(/\s+/g, " "),
};

// Le stockage de test contient un jeton de session : on ne le laisse pas trainer.
rmSync(travail, { recursive: true, force: true });
resultats.stockageDeTestSupprime = !existsSync(travail);
writeFileSync(path.join(ICI, "preuves-session-lab12.json"), JSON.stringify(resultats, null, 2));
console.log(JSON.stringify(resultats, null, 2));
