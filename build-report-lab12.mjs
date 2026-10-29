// Lab 12 — Generateur du rapport HTML.
// Relit en direct l'etat du build EAS, les variables de l'environnement
// preview, les mises a jour EAS Update, et ouvre l'APK lui-meme (paquet
// Android, URL de mise a jour, variables injectees dans le bundle). Refait les
// verifications de l'enseignant (section 13.2). Rien n'est ecrit en dur cote
// resultats.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const MOBILE = `${RACINE}/apps/mobile`;
const DIR = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab12-screens";
const DEPOT = "AhmadMbow/senevent";
const BUILD_ID = process.env.BUILD_ID;
if (!BUILD_ID) {
  console.error("Definir BUILD_ID (identifiant du build EAS preview).");
  process.exit(1);
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lire = (rel) => readFileSync(`${RACINE}/${rel}`, "utf8").trimEnd();
const sh = (cmd, cwd = RACINE) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
  }
};
const eas = (args) => sh(`npx --yes eas-cli@latest ${args} 2>/dev/null`, MOBILE);
const image = (nom) => {
  const fichier = [".png", ".jpg"].map((e) => `${DIR}/${nom}${e}`).find(existsSync);
  if (!fichier) return null;
  return `data:image/${fichier.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(fichier).toString("base64")}`;
};

// ---------- Le build, tel qu'EAS le decrit ----------
const build = JSON.parse(eas(`build:view ${BUILD_ID} --json`));
const urlApk = build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl;
const pageBuild = `https://expo.dev/accounts/${build.project?.ownerAccount?.name ?? "ahmadmbow2004"}/projects/${build.project?.slug ?? "senevent"}/builds/${BUILD_ID}`;
const minutes = (a, b) => (a && b ? ((new Date(b) - new Date(a)) / 60000).toFixed(1) : "?");

// ---------- Variables de l'environnement preview (noms et visibilite) ----------
const envLong = eas(`env:list --environment preview --format long`);
const variables = [...envLong.matchAll(/Name\s+(\S+)[\s\S]*?Visibility\s+(\S+)/g)].map((m) => ({ nom: m[1], visibilite: m[2] }));

// ---------- Les mises a jour EAS Update ----------
let mises = [];
try {
  mises = JSON.parse(eas(`update:list --branch preview --json --non-interactive`)).currentPage ?? [];
} catch {}

// ---------- L'APK lui-meme ----------
const apk = { telecharge: false };
if (urlApk) {
  const travail = mkdtempSync(path.join(tmpdir(), "senevent-apk-"));
  const fichier = path.join(travail, "senevent.apk");
  sh(`curl -sL -o "${fichier}" "${urlApk}"`);
  if (existsSync(fichier) && statSync(fichier).size > 1e6) {
    apk.telecharge = true;
    apk.taille = `${(statSync(fichier).size / 1e6).toFixed(1)} Mo`;
    const liste = sh(`unzip -l "${fichier}"`);
    apk.bundle = /assets\/index\.android\.bundle/.test(liste);
    sh(`unzip -o -q "${fichier}" AndroidManifest.xml assets/index.android.bundle -d "${travail}"`);
    // Le manifeste est en XML binaire : ses chaines sont en UTF-16.
    const manifeste = readFileSync(path.join(travail, "AndroidManifest.xml")).toString("utf16le");
    const env = Object.fromEntries(
      readFileSync(`${MOBILE}/.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
    );
    apk.paquet = manifeste.includes(JSON.parse(lire("apps/mobile/app.json")).expo.android.package);
    apk.urlMiseAJour = manifeste.includes("u.expo.dev");
    // Le bundle Hermes garde ses chaines en clair : on y cherche les variables.
    const bundle = readFileSync(path.join(travail, "assets/index.android.bundle")).toString("latin1");
    apk.urlSupabase = bundle.includes(env.EXPO_PUBLIC_SUPABASE_URL);
    apk.clePublique = bundle.includes(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    apk.serviceRole = bundle.includes("service_role");
    apk.asyncStorage = bundle.includes("AsyncStorage") || bundle.includes("RNCAsyncStorage");
  }
  rmSync(travail, { recursive: true, force: true });
}

// ---------- Session persistante (test des deux processus) ----------
const session = JSON.parse(lire("apps/mobile/preuves-session-lab12.json"));

// ---------- Verifications de l'enseignant (section 13.2) ----------
const g = (cmd) => sh(cmd);
const easPreview = g(`grep -A4 '"preview"' apps/mobile/eas.json`);
const paquetProjet = g(`grep -n '"package"\\|projectId' apps/mobile/app.json`);
const asyncLayout = g(`grep -n "AsyncStorage" apps/mobile/app/_layout.js`);
const optionsShared = g(`grep -n "options" packages/shared/src/supabaseClient.ts`);
const envSuivis = g(`git ls-files | grep -c "\\.env" || true`);
const apkReadme = g(`grep -n "APK" README.md`);
const appelsDirects = g(`git grep -n "supabase\\.from\\|createClient" -- apps/mobile | wc -l`).trim();
const commitsDepuisTag = g(`git log v1.0-web..HEAD --oneline --no-merges`).split("\n").filter(Boolean);
// Le tag v1.0-web n'a pas ete deplace : le correctif du rapport du Lab 11
// (PR #6) tombe dans l'intervalle v1.0-web..v2.0 sans faire partie du Lab 12.
const correctifsLab11 = commitsDepuisTag.filter((c) => /rapport Lab 11/i.test(c));
const commitsLab = commitsDepuisTag.filter((c) => !correctifsLab11.includes(c));
const prsLab = JSON.parse(g(`gh pr list -R ${DEPOT} --state merged --limit 30 --json number,title,mergedAt`))
  .filter((p) => p.number >= 7)
  .sort((a, b) => a.number - b.number);
const tags = g(`git tag --sort=creatordate`).split("\n").filter(Boolean);

const lignes = (rows) =>
  rows
    .map(
      ([quoi, cmd, res, ok]) => `<tr>
      <td>${esc(quoi)}</td>
      <td class="mono">${esc(cmd)}</td>
      <td class="mono">${esc(res)}</td>
      <td class="${ok ? "ok" : "ko"}">${ok ? "✓" : "✗"}</td>
    </tr>`
    )
    .join("");
const tableau = (entetes, rows) =>
  `<table>
      <thead><tr>${entetes.map((e) => `<th>${e}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c, j) => `<td${j > 0 ? ' class="mono"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;

const verifications = [
  ["Profil preview : APK, environnement preview", `grep -A4 '"preview"' apps/mobile/eas.json`, easPreview.replace(/\s+/g, " "), /"buildType": "apk"/.test(lire("apps/mobile/eas.json")) && easPreview.includes('"environment": "preview"')],
  ["Identifiant Android et projet EAS", `grep -n '"package"\\|projectId' app.json`, paquetProjet.replace(/\s+/g, " "), paquetProjet.includes("package") && paquetProjet.includes("projectId")],
  ["Le mobile passe AsyncStorage", `grep -n AsyncStorage apps/mobile/app/_layout.js`, asyncLayout.split("\n").map((l) => l.split(":")[0]).join(", ") + " (lignes)", asyncLayout.includes("storage: AsyncStorage")],
  ["initSupabase accepte des options", `grep -n options supabaseClient.ts`, `${optionsShared.split("\n").length} lignes`, optionsShared.includes("options?: SupabaseClientOptions")],
  ["Aucun .env versionne", 'git ls-files | grep -c "\\.env"', envSuivis, envSuivis === "0"],
  ["Le README donne l'APK", "grep -n APK README.md", `${apkReadme.split("\n").length} lignes`, apkReadme.includes("expo.dev")],
  ["Aucun appel Supabase direct", 'git grep "supabase.from\\|createClient" -- apps/mobile', `${appelsDirects} occurrence`, appelsDirects === "0"],
  ["Variables EAS de l'environnement preview", "eas env:list --environment preview", variables.map((v) => `${v.nom} (${v.visibilite})`).join(" · "), variables.length === 2 && variables.every((v) => v.nom.startsWith("EXPO_PUBLIC_"))],
  ["Le build preview a reussi", `eas build:view ${BUILD_ID.slice(0, 8)}…`, `${build.status} · ${build.appVersion} (${build.appBuildVersion}) · ${build.distribution}`, build.status === "FINISHED"],
  ["L'APK porte le bon paquet", "AndroidManifest.xml de l'APK", apk.paquet ? JSON.parse(lire("apps/mobile/app.json")).expo.android.package : "non trouve", apk.paquet === true],
  ["Les variables sont dans l'APK", "bundle Hermes de l'APK", `URL Supabase : ${apk.urlSupabase ? "oui" : "non"} · cle publique : ${apk.clePublique ? "oui" : "non"}`, apk.urlSupabase && apk.clePublique],
  ["service_role absent de l'APK", "bundle Hermes de l'APK", apk.serviceRole ? "trouve" : "absent", apk.serviceRole === false],
  ["La session survit au redemarrage", "test-session-lab12.mjs", `sans option : ${session.aucun.sessionRetrouvee ?? "perdue"} · AsyncStorage : ${session.asyncstorage.sessionRetrouvee ? "retrouvee" : "perdue"}`, session.aucun.sessionRetrouvee === null && Boolean(session.asyncstorage.sessionRetrouvee)],
  ["Bonus : l'APK sait se mettre a jour", "manifeste + eas update:list", `URL u.expo.dev : ${apk.urlMiseAJour ? "oui" : "non"} · ${mises.length} mise(s) a jour sur preview`, apk.urlMiseAJour && mises.length > 0],
];

const figure = ([n, route, titre, legende, fichier]) => {
  const src = image(fichier);
  if (!src) return "";
  return `
    <figure class="shot">
      <div class="shot-head">
        <span class="fig-n">Figure ${n}</span><span class="route">${esc(route)}</span>
        <h3>${esc(titre)}</h3>
      </div>
      <img src="${src}" alt="${esc(titre)}">
      <figcaption>${esc(legende)}</figcaption>
    </figure>`;
};

const extrait = (rel, debut, fin, plus = 0) => {
  const L = lire(rel).split("\n");
  const i = L.findIndex((l) => l.includes(debut));
  const j = L.findIndex((l, k) => k > i && l.includes(fin));
  return L.slice(i, j + 1 + plus).join("\n");
};
const initShared = extrait("packages/shared/src/supabaseClient.ts", "export function initSupabase", "return client;", 1);
const initMobile = extrait("apps/mobile/app/_layout.js", "initSupabase(", ");");
const easJson = lire("apps/mobile/eas.json");

const recette = [
  ["1", "Ouvrir l'application SenEvent", "liste des evenements chargee", "l'APK contient l'URL Supabase et la cle : pas de « supabaseUrl is required »"],
  ["2", "Toucher un evenement", "la fiche de detail s'affiche", "parcours du Lab 9, meme code"],
  ["3", "Onglet Profil, se connecter", "email affiche, bouton de deconnexion", "parcours du Lab 10, meme code"],
  ["4", "Fermer completement l'application, la rouvrir", "toujours connecte", "test des deux processus : session retrouvee avec AsyncStorage"],
  ["5", "Creer un evenement avec le bouton +", "il apparait dans la liste", "parcours du Lab 10"],
  ["6", "Ouvrir le site Vercel sur un autre appareil", "l'evenement de l'etape 5 y est", "demo croisee du Lab 10 et recette du Lab 11"],
  ["7", "Creer un evenement sur le site", "il apparait dans l'app au retour sur la liste", "useFocusEffect, Lab 10"],
  ["8", "S'inscrire a un evenement dans l'app", "bouton « Se desinscrire »", "parcours du Lab 10"],
  ["9", "Se deconnecter, toucher un evenement", "invitation a se connecter", "parcours du Lab 10"],
  ["10", "Installer l'APK sur un autre telephone", "meme comportement", "meme APK, lien public"],
];
const recetteHtml = recette
  .map(([n, action, attendu, amont]) => `<tr><td class="mono">${n}</td><td>${esc(action)}</td><td>${esc(attendu)}</td><td class="mono">${esc(amont)}</td><td class="manuel">à faire</td></tr>`)
  .join("");

const CSS =
  readFileSync(`${RACINE}/build-report-lab10.mjs`, "utf8").match(/const CSS = `([\s\S]*?)`;/)[1] +
  `
  td.manuel { color: #9a6700; font-weight: 800; white-space: nowrap; }
`;

const derniereMaj = mises[0] && {
  ...mises[0],
  // update:list ajoute « (il y a N minutes par …) » apres le message entre guillemets.
  message: mises[0].message.match(/^"(.*)"/)?.[1] ?? mises[0].message,
};
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>SenEvent — Rapport Lab 12</title>
<style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">Sen<b>Event</b></span>
      <span class="nav">apps/web&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#fff">apps/mobile</b>&nbsp;&nbsp;·&nbsp;&nbsp;packages/shared</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Déploiement 2/2 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 12 — Build mobile avec EAS : l'APK Android</h1>
    <p class="lede">Rapport de réalisation : l'application mobile quitte Expo Go. EAS Build l'a compilée sur les serveurs d'Expo en un APK installable, qui embarque le même package partagé que le site Vercel et parle à la même base. La session de l'utilisateur survit désormais à la fermeture de l'application, et l'APK sait recevoir des corrections JavaScript sans être reconstruit.</p>
    <div class="chips">
      <span class="chip tag">tag : v2.0</span>
      <span class="chip">APK ${esc(build.appVersion)} · versionCode ${esc(build.appBuildVersion)}</span>
      <span class="chip">${esc(JSON.parse(lire("apps/mobile/app.json")).expo.android.package)}</span>
      <span class="chip">Expo SDK ${esc(build.sdkVersion)}</span>
      <span class="chip">AsyncStorage</span>
      <span class="chip">EAS Update · channel preview</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> D'Expo Go à une application compilée</h2>
    <p>Expo Go exécute le JavaScript que lui envoie le serveur de développement d'un ordinateur : l'ordinateur éteint, l'application disparaît. Un APK contient tout — le moteur React Native, les modules natifs et le JavaScript assemblé une fois pour toutes — et porte son propre nom et son propre identifiant. EAS Build fait la compilation Android (Gradle) sur les serveurs d'Expo : aucune installation d'Android Studio n'a été nécessaire.</p>
    ${tableau(
      ["", "Expo Go (Labs 8–11)", "APK (Lab 12)"],
      [
        ["Le JavaScript vient de", "le serveur Metro de l'ordinateur", "l'APK lui-même (bundle Hermes)"],
        ["Les cles Supabase viennent de", "apps/mobile/.env, lu par Metro", "l'environnement EAS preview, au build"],
        ["La session est gardee", "en memoire (perdue a la fermeture)", "dans AsyncStorage"],
        ["Identite", "celle d'Expo Go", `SenEvent · ${esc(JSON.parse(lire("apps/mobile/app.json")).expo.android.package)}`],
      ]
    )}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> Préparer le projet : expo-doctor et app.json</h2>
    <p><code>expo-doctor</code> signalait deux paquets en retard d'un correctif sur le SDK 57 (<code>expo</code> 57.0.30, <code>expo-router</code> 57.0.28), corrigés avec <code>npx expo install --fix</code>. Le seul contrôle restant porte sur la version de Xcode de la machine : il concerne les builds iOS locaux, pas le build Android d'EAS. L'identité de l'application :</p>
    ${tableau(
      ["Champ", "Valeur", "Rôle"],
      [
        ["name", esc(JSON.parse(lire("apps/mobile/app.json")).expo.name), "le nom sous l'icone"],
        ["version", esc(JSON.parse(lire("apps/mobile/app.json")).expo.version), "la version visible ; elle sert aussi de runtimeVersion a EAS Update"],
        ["android.package", esc(JSON.parse(lire("apps/mobile/app.json")).expo.android.package), "identifiant definitif de l'application sur Android"],
        ["owner · projectId", `${esc(JSON.parse(lire("apps/mobile/app.json")).expo.owner)} · ${esc(JSON.parse(lire("apps/mobile/app.json")).expo.extra.eas.projectId)}`, "ajoutes par eas init : toute l'equipe vise le meme projet EAS"],
      ]
    )}
    <p style="margin-top:10px">Le compte Expo est <code>${esc(JSON.parse(lire("apps/mobile/app.json")).expo.owner)}</code>. La connexion du CLI s'est faite par la méthode « appareil » (<code>eas login --device</code>) : le terminal de l'outil n'étant pas interactif, l'utilisateur a validé un code dans son navigateur, sans qu'aucun mot de passe ne transite par l'outil.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> Les profils de build</h2>
    <p class="code-label">apps/mobile/eas.json</p>
    <pre>${esc(easJson)}</pre>
    <p>Le profil <code>preview</code> produit un APK (<code>buildType: apk</code>) au lieu de l'AAB du Play Store, lit les variables de l'environnement EAS <code>preview</code>, et publie ses mises à jour sur le channel <code>preview</code> (bonus). <code>appVersionSource: remote</code> laisse EAS tenir le compteur de versions : le premier build a initialisé le versionCode à ${esc(build.appBuildVersion)}.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">04</span> Les variables d'environnement EAS</h2>
    <p>Le piège du Lab 11 se rejoue : <code>apps/mobile/.env</code> est ignoré par Git, donc absent de ce qu'EAS envoie. Avant la déclaration, <code>eas config</code> l'annonçait déjà : « No environment variables … found for the "preview" environment ». Les deux variables ont été envoyées depuis le <code>.env</code> par <code>eas env:push preview --path .env</code>, lancée par l'utilisateur : leurs valeurs ne sont jamais passées par l'outil.</p>
    ${tableau(["Variable", "Visibilité", "Environnement"], variables.map((v) => [esc(v.nom), esc(v.visibilite), "preview"]))}
    <p style="margin-top:10px">Le journal du build l'a confirmé au lancement : <i>Environment variables … loaded from the "preview" environment on EAS: EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL</i>. Et l'APK final les contient bien (section 08) — comme <code>VITE_</code> sur le web, une variable <code>EXPO_PUBLIC_</code> est lisible par quiconque extrait l'APK : sans danger pour la clé publique protégée par la RLS, et c'est pourquoi <code>service_role</code> n'y figure pas.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> Une session qui survit à la fermeture</h2>
    <p>React Native n'a pas de <code>localStorage</code> : sans stockage fourni, supabase-js garde la session en mémoire, et l'utilisateur est déconnecté à chaque fermeture — la limite relevée au Lab 10. Le package partagé accepte maintenant un troisième paramètre, optionnel :</p>
    <p class="code-label">packages/shared/src/supabaseClient.ts</p>
    <pre>${esc(initShared)}</pre>
    <p>Le web n'a pas changé : <code>${esc(session.webInchange.appelWeb)}</code>. Seul le mobile passe un stockage :</p>
    <p class="code-label">apps/mobile/app/_layout.js</p>
    <pre>${esc(initMobile)}</pre>
  </section>

  <section class="avoid">
    <p><b>La preuve, sans téléphone.</b> Node n'a pas de <code>localStorage</code> non plus. <code>apps/mobile/test-session-lab12.mjs</code> regroupe le vrai package partagé et le fait tourner dans deux processus séparés : le premier se connecte, le second — tout neuf, comme une application rouverte — relit la session. Le stockage de test reprend les trois méthodes asynchrones d'AsyncStorage, écrites sur disque.</p>
    ${tableau(
      ["Initialisation", "Ce qui est stocké", "Après le « redémarrage »"],
      [
        ["initSupabase(url, key) — Lab 10", session.aucun.clesStockees.length ? esc(session.aucun.clesStockees.join(", ")) : "rien", session.aucun.sessionRetrouvee ? "session retrouvee" : "session perdue (null)"],
        ["initSupabase(url, key, { auth: { storage } }) — Lab 12", esc(session.asyncstorage.clesStockees.join(", ")), session.asyncstorage.sessionRetrouvee ? `session retrouvee (${esc(session.asyncstorage.sessionRetrouvee.replace(/\+.*@/, "+…@"))})` : "session perdue"],
      ]
    )}
    <p style="margin-top:10px">Côté web, la connexion survit toujours au rechargement (clé <code>sb-…-auth-token</code> dans le <code>localStorage</code>), et la préversion Vercel de la PR #7 — qui touchait <code>packages/shared</code> — a construit le site sans erreur. Le stockage de test, qui contient un jeton, est supprimé à la fin du test.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">06</span> Ce qui part sur les serveurs d'Expo</h2>
    <p>EAS envoie tout le dépôt, depuis la racine, à l'exception de ce que <code>.gitignore</code> exclut. Avant le build, l'archive a été produite localement par <code>eas build:inspect --stage archive</code> et fouillée. Un dossier y figurait à tort : <code>supabase/fixtures/</code>, jamais versionné mais pas ignoré non plus, qui contient le mot de passe des comptes de test. Il a été ajouté au <code>.gitignore</code> (PR #9) avant le build.</p>
    ${tableau(
      ["Dans l'archive envoyée", "Résultat"],
      [
        ["apps/mobile/.env, apps/web/.env.local", "absents"],
        ["supabase/fixtures/ (apres la PR #9)", "dossier vide, aucun fichier"],
        ["mot de passe des comptes de test", "0 fichier"],
        ["cle publique Supabase", "0 fichier (elle vient des variables EAS)"],
        ["service_role", "0 fichier de code"],
      ]
    )}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Le build</h2>
    <p>Lancé une seule fois, depuis <code>main</code> à jour (après les PR #7, #8 et #9), pour préserver le quota gratuit. Au premier build, EAS a généré le keystore Android — la clé qui signe l'application — et le conserve pour les suivants.</p>
    ${tableau(
      ["", "Valeur"],
      [
        ["Statut", esc(build.status)],
        ["Profil · distribution", `${esc(build.buildProfile)} · ${esc(build.distribution)}`],
        ["Version · versionCode", `${esc(build.appVersion)} · ${esc(build.appBuildVersion)}`],
        ["SDK · runtimeVersion · channel", `${esc(build.sdkVersion)} · ${esc(build.runtime?.version)} · ${esc(build.updateChannel?.name)}`],
        ["Duree totale (file d'attente comprise)", `${minutes(build.createdAt, build.completedAt)} min`],
        ["Commit construit", esc((build.gitCommitHash ?? "").slice(0, 7))],
        ["Temps de compilation · file d'attente", `${(build.metrics?.buildDuration / 60000).toFixed(1)} min · ${Math.round(build.metrics?.buildQueueTime / 1000)} s`],
        ["Lien de l'APK valable jusqu'au", esc((build.expirationDate ?? "").slice(0, 10))],
        ["Page du build", esc(pageBuild)],
      ]
    )}
    ${figure(["01", "expo.dev", "La page du build", "Le bouton Install et le QR code pointent vers l'APK : c'est le lien donne dans le README.", "01-build-expo"])}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> Ce que contient l'APK</h2>
    <p>L'APK (${esc(apk.taille ?? "?")}) a été téléchargé depuis EAS et ouvert, sans être exécuté : c'est l'application que recevra le téléphone.</p>
    ${tableau(
      ["Contrôle", "Où", "Résultat"],
      [
        ["Bundle JavaScript embarque", "assets/index.android.bundle", apk.bundle ? "present (Hermes)" : "absent"],
        ["Identifiant Android", "AndroidManifest.xml", apk.paquet ? esc(JSON.parse(lire("apps/mobile/app.json")).expo.android.package) : "non trouve"],
        ["URL Supabase injectee", "bundle", apk.urlSupabase ? "presente" : "absente"],
        ["Cle publique injectee", "bundle", apk.clePublique ? "presente" : "absente"],
        ["service_role", "bundle", apk.serviceRole ? "TROUVEE" : "absente"],
        ["URL de mise a jour (bonus)", "AndroidManifest.xml", apk.urlMiseAJour ? "u.expo.dev presente" : "absente"],
      ]
    )}
    <p style="margin-top:10px">La troisième ligne écarte le piège de l'étape 4 : sans les variables EAS, l'application se serait arrêtée au démarrage sur « supabaseUrl is required ».</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">09</span> La recette finale</h2>
    <p>La recette se fait sur un téléphone Android, ordinateurs éteints, en 4G : elle revient à l'équipe. La dernière colonne indique ce qui a été vérifié en amont, sur le même code ou sur l'APK lui-même.</p>
    <table>
      <thead><tr><th>#</th><th>Action</th><th>Attendu</th><th>Vérifié en amont</th><th>État</th></tr></thead>
      <tbody>${recetteHtml}</tbody>
    </table>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">10</span> Bonus : mettre à jour sans recompiler</h2>
    <p><code>expo-updates</code> a été installé <i>avant</i> l'unique build : l'APK interroge ainsi <code>u.expo.dev</code> à l'ouverture et télécharge le JavaScript publié sur son channel, pour la même <code>runtimeVersion</code> (${esc(build.runtime?.version)}). Une correction de texte — le sous-titre de l'écran Profil, qui donne désormais l'adresse du site — a été fusionnée (PR #11) puis publiée :</p>
    <pre>eas update --channel preview --environment preview --platform android \\
  --message "${esc(derniereMaj?.message ?? "")}"</pre>
    <p><code>--platform android</code> s'ajoute à la commande du sujet : <code>eas update:configure</code> n'a défini la <code>runtimeVersion</code> que pour Android, la seule plateforme construite ici.</p>
    ${tableau(
      ["Mise à jour publiée", "Valeur"],
      derniereMaj
        ? [
            ["Message", esc(derniereMaj.message)],
            ["Branche · runtimeVersion", `${esc(derniereMaj.branch ?? "preview")} · ${esc(derniereMaj.runtimeVersion)}`],
            ["Plateformes", esc(derniereMaj.platforms ?? "")],
            ["Compatible avec l'APK", derniereMaj.runtimeVersion === build.runtime?.version ? "oui (meme runtimeVersion)" : "NON"],
          ]
        : [["—", "aucune mise a jour trouvee"]]
    )}
    <p style="margin-top:10px">Il faut fermer et rouvrir l'application deux fois : la première ouverture télécharge la mise à jour, la seconde l'applique. Limite à connaître : seul le JavaScript se met à jour ainsi ; un nouveau paquet natif, comme AsyncStorage, exige un nouveau build.</p>
    ${figure(["02", "expo.dev", "La mise à jour sur le channel preview", "Publiee sans nouveau build ; l'APK installe la recupere a la prochaine ouverture.", "02-update-expo"])}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">11</span> Ce que la validation a réellement donné</h2>
    <p>Les vérifications de l'enseignant (section 13.2), l'état d'EAS et le contenu de l'APK, relus au moment de générer ce rapport :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(verifications)}</tbody>
    </table>
    <p style="margin-top:10px">Le lab compte ${commitsLab.length} commits, passés par ${prsLab.length} Pull Requests (${prsLab.map((p) => `#${p.number}`).join(", ")}), chacune construite par GitHub Actions et prévisualisée par Vercel avant sa fusion.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">12</span> Écarts et points à savoir</h2>
    ${tableau(
      ["Le sujet", "Ici", "Pourquoi"],
      [
        ["sn.ucad.senevent.equipe1", "sn.ucad.senevent.mbow", "coherent avec le projet Vercel senevent-mbow"],
        ["eas login", "eas login --device", "le terminal de l'outil n'est pas interactif : validation d'un code dans le navigateur"],
        ["eas env:set (x2)", "eas env:push preview --path .env", "les valeurs vont du .env a EAS sans etre recopiees"],
        ["deux PR (A puis B)", "une PR pour A et B, puis une pour le bonus", "meme ordre de fusion, avant le build"],
        ["—", "supabase/fixtures/ ajoute au .gitignore", "sinon EAS envoyait le mot de passe des comptes de test"],
        ["bonus : un build de plus", "expo-updates avant l'unique build", "un seul build consomme sur le quota gratuit"],
        ["eas update --channel preview …", "… --platform android", "runtimeVersion configuree pour Android seulement"],
        ["git log v1.0-web..v2.0", `contient aussi ${correctifsLab11.length} correctif du rapport du Lab 11`, "PR #6, fusionnee apres le tag v1.0-web, qui n'a pas ete deplace"],
      ]
    )}
    <p style="margin-top:10px"><b>L'historique pour la soutenance.</b> Le dépôt porte les tags ${tags.map((t) => `<code>${esc(t)}</code>`).join(" ")}. Les Labs 0 à 3 ont été menés avant le dépôt actuel : leurs commits sont rattachés à l'historique (Lab 11), mais seul <code>v1-lab1</code> en marque une étape — les tags <code>v0-init</code> à <code>v0.3-effects</code> du sujet n'existent pas.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">13</span> Ce qui reste à faire par l'équipe</h2>
    <p><b>Installer l'APK sur un téléphone Android</b> depuis le lien du README, puis mener les dix points de la recette en 4G, Wi-Fi coupé. Les lignes 4 (session après fermeture) et 10 (deuxième téléphone) ne se vérifient que sur un appareil réel.</p>
    <p><b>Vérifier la mise à jour EAS Update</b> : sur l'écran Profil déconnecté, le sous-titre doit devenir « Le meme compte que sur senevent-mbow.vercel.app. » après deux ouvertures.</p>
    <p><b>L'iPhone reste hors périmètre</b> : installer hors App Store demande un compte Apple Developer payant. Les membres équipés d'un iPhone continuent avec Expo Go — qui demandera, pour le SDK 57, un Xcode ≥ 26.4 sur la machine pour les builds iOS locaux.</p>
  </section>

  <section class="callout">
    <h2>Et maintenant : la soutenance</h2>
    <p>Les deux clients sont en production : le site sur <code>senevent-mbow.vercel.app</code>, l'application Android à installer depuis expo.dev. La démonstration croisée — créer un événement sur le web, le voir et s'y inscrire sur le téléphone, et inversement — se fait désormais sans aucun ordinateur de développement. Une logique métier écrite une fois au Lab 7, deux interfaces, une base.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 12 — Build mobile avec EAS</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${RACINE}/rapport-lab12.html`, html);
console.log("rapport-lab12.html ecrit,", html.length, "caracteres");
console.log({ build: build.status, apk, variables, mises: mises.length, echecs: verifications.filter((v) => !v[3]).map((v) => v[0]) });
