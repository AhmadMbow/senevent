// Lab 9 — Generateur du rapport HTML.
// Lit les captures et les preuves produites par apps/mobile/capture-lab9.mjs,
// et refait ici les verifications de l'enseignant (section 9.2) ainsi que les
// bundles natifs. Rien n'est ecrit en dur cote resultats.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const DIR = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab9-screens";

const b64 = (chemin) =>
  `data:image/png;base64,${readFileSync(chemin).toString("base64")}`;
const shot = (nom) => b64(`${DIR}/${nom}.png`);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lire = (rel) => readFileSync(`${RACINE}/${rel}`, "utf8").trimEnd();

const sh = (cmd, cwd = RACINE) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
  }
};

const p = JSON.parse(readFileSync(`${DIR}/preuves-lab9.json`, "utf8"));

// ---------- Bundles natifs (vrai Metro, vraie resolution) ----------
const MOBILE = `${RACINE}/apps/mobile`;
function bundle(plateforme) {
  const sortie = mkdtempSync(path.join(tmpdir(), `senevent-${plateforme}-`));
  const log = sh(
    `npx expo export --platform ${plateforme} --dump-sourcemap --output-dir "${sortie}"`,
    MOBILE
  );
  const m = log.match(/Bundled \d+ms .*?\((\d+) modules\)/);
  const carte = sh(`find "${sortie}" -name '*.map' | head -1`);
  const sources = carte ? JSON.parse(readFileSync(carte, "utf8")).sources : [];
  // D'ou viennent react et react-native dans le bundle : une seule copie attendue.
  const copies = (nom) =>
    new Set(
      sources
        .map((s) => s.match(new RegExp(`(.*node_modules)/${nom}/`))?.[1])
        .filter(Boolean)
        .map((d) => (d.includes("senevent") ? d.split("senevent")[1] : d))
    );
  return {
    modules: m ? Number(m[1]) : null,
    react: [...copies("react")],
    reactNative: [...copies("react-native")],
  };
}
const android = bundle("android");
const ios = bundle("ios");

// ---------- Verifications de l'enseignant (section 9.2) ----------
const appJsAbsent = sh(`test ! -f apps/mobile/App.js && echo supprime || echo present`);
const ecransOnglets = sh(`ls "apps/mobile/app/(tabs)/"`).split("\n").join(" ");
const detailPresent = sh(`test -f "apps/mobile/app/evenement/[id].js" && echo OK || echo MANQUE`);
const lecteursParam = sh(`grep -rl "useLocalSearchParams" apps/mobile/app`);
const appelsSupabaseDirects = sh(
  `git grep -n "supabase\\.from\\|createClient" -- apps/mobile | wc -l`
);
const entree = JSON.parse(lire("apps/mobile/package.json")).main;
const scheme = JSON.parse(lire("apps/mobile/app.json")).expo.scheme;
const envSuivi = sh(`git ls-files | grep -c "apps/mobile/.env$" || true`);
const commitsLab = sh(`git log v0.8-expo..HEAD --oneline --no-merges`).split("\n").filter(Boolean);

const unique = (b) => b.react.length === 1 && b.reactNative.length === 1;

const preuves = [
  ["L'ancien App.js est supprime", "test ! -f apps/mobile/App.js", appJsAbsent, appJsAbsent === "supprime"],
  ["Point d'entree Expo Router", '"main" de apps/mobile/package.json', entree, entree === "expo-router/entry"],
  ["Schema d'application declare", '"scheme" de app.json', scheme, scheme === "senevent"],
  ["Le groupe (tabs) contient les onglets", 'ls "apps/mobile/app/(tabs)/"', ecransOnglets, /index\.js/.test(ecransOnglets) && /profil\.js/.test(ecransOnglets)],
  ["La route parametree existe", 'test -f "apps/mobile/app/evenement/[id].js"', detailPresent, detailPresent === "OK"],
  ["Le detail lit l'id de l'URL", "grep -rl useLocalSearchParams apps/mobile/app", lecteursParam, lecteursParam.includes("[id].js")],
  ["Aucune logique Supabase reecrite", 'git grep "supabase.from\\|createClient" -- apps/mobile', `${appelsSupabaseDirects} occurrence`, appelsSupabaseDirects === "0"],
  ["Le .env mobile n'est pas versionne", 'git ls-files | grep -c "apps/mobile/.env$"', `${envSuivi} fichier suivi`, envSuivi === "0"],
  ["Bundle Android", "npx expo export --platform android", `${android.modules} modules`, Boolean(android.modules)],
  ["Bundle iOS", "npx expo export --platform ios", `${ios.modules} modules`, Boolean(ios.modules)],
  ["Une seule copie de React dans le bundle", "sources de la sourcemap Android", `react : ${android.react.join(", ")} · react-native : ${android.reactNative.join(", ")}`, unique(android)],
];

const navigation = [
  ["L'app demarre sur l'onglet Evenements", "chemin au lancement", p.liste.chemin, p.liste.chemin === "/" && p.liste.cartes > 0],
  ["Deux onglets dans la barre du bas", "liens role=tab", p.liste.onglets.map((o) => `${o.libelle.replace(/[\uE000-\uF8FF]/g, "").trim()} → ${o.href}`).join(" · "), p.liste.onglets.length === 2],
  ["Toucher une carte ouvre son detail", `toucher ${p.detail.carteTouchee}`, p.detail.chemin, p.detail.chemin === p.detail.carteTouchee],
  ["Le detail affiche l'evenement de l'URL", "titre et lieu compares a la reponse Supabase", p.detail.titreAttendu, p.detail.titreAffiche && p.detail.lieuAffiche],
  ["Le detail rappelle getEvenements()", "requetes /rest/v1/evenements a l'ouverture", `+${p.detail.requetesSupplementaires}`, p.detail.requetesSupplementaires === 1],
  ["La fleche retour ramene a la liste", "toucher la fleche du Stack", p.retour.chemin, p.retour.chemin === "/"],
  ["L'onglet Profil s'affiche", "toucher l'onglet Profil", p.profil.chemin, p.profil.chemin === "/profil" && p.profil.placeholder],
  ["Chaque onglet garde son etat", "requetes en revenant sur Evenements", `${p.retourOnglet.rechargementListe} rechargement`, p.retourOnglet.rechargementListe === 0],
  ["Lien direct vers un detail", `ouvrir ${p.lienDirect.url} puis retour`, p.lienDirect.cheminApresRetour, p.lienDirect.flecheRetour > 0 && p.lienDirect.cheminApresRetour === "/"],
  ["Identifiant inconnu", "ouvrir /evenement/999999", p.introuvable.message ? "Evenement introuvable." : "non affiche", p.introuvable.message],
  ["Bonus : Retour a la liste par code", `depuis ${p.bonus.depuis}`, `${p.bonus.chemin} · ${p.bonus.flechesApres} fleche restante`, p.bonus.chemin === "/" && p.bonus.flechesApres === 0],
  ["Aucune erreur JavaScript", "pageerror pendant tout le parcours", `${p.erreursJs.length} erreur`, p.erreursJs.length === 0],
  ["La donnee vient bien de Supabase", "domaines contactes", p.supabaseContacte ? "supabase.co contacte" : "non contacte", p.supabaseContacte],
];

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

// ---------- Correspondance Lab 4 -> Lab 9 ----------
const correspondances = [
  ["Declarer une route", "&lt;Route path=\"/\" element={…} /&gt;", "un fichier dans app/"],
  ["Route parametree", "/evenement/:id", "app/evenement/[id].js"],
  ["Lire le parametre", "useParams()", "useLocalSearchParams()"],
  ["Naviguer par code", "useNavigate()", "useRouter()"],
  ["Lien cliquable", "&lt;Link to={…}&gt;", "&lt;Link href={…}&gt;"],
  ["Point de montage", "&lt;BrowserRouter&gt; dans App.jsx", "app/_layout.js"],
  ["Logique metier", "getEvenements() de @senevent/shared", "getEvenements() de @senevent/shared"],
];
const corrHtml = correspondances
  .map(
    ([besoin, web, mobile], i) => `<tr${i === correspondances.length - 1 ? ' class="ligne-cle"' : ""}>
      <td>${esc(besoin)}</td>
      <td class="mono">${web}</td>
      <td class="mono">${mobile}</td>
    </tr>`
  )
  .join("");

// ---------- Figures ----------
const figures = [
  ["01", "/", "Onglet Evenements", `La liste du Lab 8 vit maintenant dans app/(tabs)/index.js. La barre d'onglets en bas vient du layout Tabs ; les ${p.liste.cartes} cartes sont des liens vers /evenement/:id.`, shot("01-onglet-evenements")],
  ["02", p.detail.chemin, "Detail apres un toucher", `Le detail est empile au-dessus des onglets par le Stack racine, avec sa fleche retour. L'id ${p.detail.chemin.split("/").pop()} est lu dans l'URL par useLocalSearchParams, l'evenement retrouve dans getEvenements(). En bas, le bouton du bonus.`, shot("02-detail")],
  ["03", "/profil", "Onglet Profil", "Placeholder : la connexion arrive au Lab 10. L'en-tete est celui du navigateur Tabs ; l'icone de l'onglet actif passe en orange et en version pleine.", shot("03-onglet-profil")],
  ["04", p.lienDirect.url, "Lien direct", "Ouvert directement par son URL, comme le fera un lien profond senevent://. Grace a initialRouteName, les onglets sont places dessous : la fleche retour existe et ramene a la liste.", shot("04-lien-direct")],
  ["05", "/evenement/999999", "Identifiant inconnu", "Le .find() ne trouve rien : l'ecran le dit clairement et propose de revenir a la liste, au lieu d'un ecran blanc ou d'un spinner infini.", shot("05-introuvable")],
];
const figuresHtml = figures
  .map(
    ([n, route, titre, legende, src]) => `
    <figure class="shot">
      <div class="shot-head">
        <span class="fig-n">Figure ${n}</span><span class="route">${esc(route)}</span>
        <h3>${esc(titre)}</h3>
      </div>
      <img src="${src}" alt="${esc(titre)}">
      <figcaption>${esc(legende)}</figcaption>
    </figure>`
  )
  .join("");

// ---------- Extraits de code reels ----------
const extrait = (rel, debut, fin) => {
  const L = lire(rel).split("\n");
  const i = L.findIndex((l) => l.includes(debut));
  const j = L.findIndex((l, k) => k > i && l.includes(fin));
  return L.slice(i, j + 1).join("\n");
};
const layoutRacine = extrait("apps/mobile/app/_layout.js", "initSupabase(", "</Stack>");
const layoutOnglets = extrait("apps/mobile/app/(tabs)/_layout.js", '<Tabs.Screen', "/>");
const carteLien = extrait("apps/mobile/components/EvenementCarte.js", "<Link href", "<View style={[styles.carte");
const detailParam = extrait("apps/mobile/app/evenement/[id].js", "const { id } = useLocalSearchParams", "}, [id]);");
const bonus = extrait("apps/mobile/app/evenement/[id].js", "function BoutonRetourListe", "</Pressable>");
const metroRegle = (() => {
  const L = lire("apps/mobile/metro.config.js").split("\n");
  return L.slice(L.findIndex((l) => l.startsWith("// 3.")), L.findIndex((l) => l.startsWith("module.exports"))).join("\n").trimEnd();
})();

const arbre = `apps/mobile/
  app/
    _layout.js               # Stack racine + initSupabase
    (tabs)/
      _layout.js             # navigateur Tabs (2 onglets + icones)
      index.js               # onglet Evenements : FlatList, filtres, etats
      profil.js              # onglet Profil (placeholder Lab 10)
    evenement/
      [id].js                # detail : useLocalSearchParams + bonus useRouter
  components/
    EvenementCarte.js        # carte cliquable (Link asChild)
    EnteteAccueil.js         # en-tete de marque, zone sure via useSafeAreaInsets
    FiltreCategories.js · CarteSquelette.js
  theme.js · format.js
  metro.config.js            # resolution monorepo (revue pour Expo Router)
  app.json                   # scheme "senevent" + plugin expo-router
  package.json               # main : expo-router/entry`;

const CSS = `
  @page { size: A4; margin: 15mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  :root {
    --navy: #1a3a5c; --navy-deep: #14304d; --orange: #ea7d2b;
    --red: #a01a1a; --green: #1f7a4d; --purple: #5b4b8a;
    --ink: #1b2430; --muted: #566070; --border: #d9dfe8; --soft: #eef1f6;
    --code-bg: #0f2033;
  }
  html { font-size: 10.5pt; }
  body { margin: 0; color: var(--ink); background: #fff;
    font-family: "Helvetica Neue", Arial, system-ui, sans-serif; line-height: 1.55; }
  code, .mono, pre { font-family: "SFMono-Regular", Menlo, Consolas, monospace; }
  code { background: var(--soft); color: var(--navy); padding: .08em .35em; border-radius: 4px; font-size: .82em; }

  .cover { background: linear-gradient(160deg, #16324f, #0b1622);
    color: #fff; border-radius: 10px; padding: 26px 28px; margin-bottom: 24px; }
  .cover .top { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,.18); padding-bottom: 12px; margin-bottom: 18px; }
  .logo { font-weight: 800; font-size: 15pt; color: #fff; }
  .logo b { color: var(--orange); }
  .top .nav { font-size: 9pt; color: rgba(255,255,255,.7); }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 7.5pt;
    font-weight: 700; color: var(--orange); margin: 0 0 8px; }
  .cover h1 { margin: 0 0 8px; font-size: 22pt; line-height: 1.1; font-weight: 800; letter-spacing: -.01em; }
  .cover .lede { margin: 0 0 16px; max-width: 64ch; color: rgba(255,255,255,.85); font-size: 10.5pt; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 8pt; font-weight: 600; padding: 4px 9px; border-radius: 999px;
    background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); }
  .chip.tag { background: var(--orange); color: #1c1206; border-color: var(--orange); font-weight: 700; }

  section { margin-bottom: 22px; }
  h2 { font-size: 14pt; font-weight: 800; letter-spacing: -.01em; margin: 0 0 8px;
    display: flex; align-items: baseline; gap: 9px; }
  .sec-n { font-family: Menlo, monospace; font-size: 8.5pt; color: var(--orange);
    border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; }
  section > p { margin: 0 0 10px; color: var(--muted); max-width: 72ch; }

  table { border-collapse: collapse; width: 100%; font-size: 9pt;
    border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 7px 11px; border-bottom: 1px solid var(--border); vertical-align: top; }
  thead th { background: var(--soft); font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  tbody tr:last-child td { border-bottom: none; }
  td.mono { color: var(--muted); font-size: 8.1pt; }
  .ok { color: var(--green); font-weight: 800; }
  .ko { color: var(--red); font-weight: 800; }
  tr.ligne-cle td { background: #fff6ec; font-weight: 600; color: var(--ink); }

  pre { background: var(--code-bg); color: #dbe6f3; border-radius: 8px;
    padding: 12px 14px; font-size: 8.2pt; line-height: 1.5; overflow-x: auto;
    margin: 0 0 6px; break-inside: avoid; page-break-inside: avoid; }
  .code-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .07em;
    color: var(--muted); margin: 0 0 4px; font-weight: 700; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }

  .shot { break-inside: avoid; page-break-inside: avoid; margin: 0 0 16px;
    border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
  .shot-head { padding: 10px 14px 8px; background: var(--soft); border-bottom: 1px solid var(--border); }
  .shot-head .fig-n { font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--orange); }
  .shot-head .route { font-family: Menlo, monospace; font-size: 8pt; color: var(--muted);
    background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; margin-left: 8px; }
  .shot-head h3 { margin: 5px 0 0; font-size: 11pt; font-weight: 700; }
  .shot img { display: block; width: 100%; height: auto; border-bottom: 1px solid var(--border); }
  figcaption { padding: 10px 14px; font-size: 8.6pt; color: var(--muted); }
  .grille-shots { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }

  .callout { border: 1px solid var(--border); border-left: 4px solid var(--orange);
    border-radius: 8px; padding: 12px 16px; break-inside: avoid; }
  .callout h2 { font-size: 11.5pt; color: var(--orange); margin-bottom: 5px; }
  .callout p { margin: 0; color: var(--ink); font-size: 9.6pt; }

  .marque { display: flex; align-items: center; gap: 18px; border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 16px; break-inside: avoid; }
  .marque img { width: 96px; height: 96px; border-radius: 20px; display: block; }
  .marque p { margin: 0; font-size: 9.2pt; color: var(--muted); }

  .foot { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 10px;
    display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
  .pb { page-break-before: always; }
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>SenEvent — Rapport Lab 9</title>
<style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">Sen<b>Event</b></span>
      <span class="nav">apps/web&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#fff">apps/mobile</b>&nbsp;&nbsp;·&nbsp;&nbsp;packages/shared</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Mobile 2/3 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 9 — Expo Router et navigation mobile</h1>
    <p class="lede">Rapport de réalisation : l'application mobile passe d'un seul écran à une vraie navigation. Une barre d'onglets (Événements, Profil), un écran de détail empilé qui lit l'id de l'événement dans l'URL, et des cartes qui y mènent d'un toucher. Ce sont les concepts de React Router du Lab 4, traduits dans le vocabulaire d'Expo Router — et toujours <code>getEvenements()</code> du package partagé, sans requête réécrite.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.9-router</span>
      <span class="chip">Expo Router 6 · SDK 54</span>
      <span class="chip">Stack + Tabs</span>
      <span class="chip">evenement/[id].js</span>
      <span class="chip">useLocalSearchParams</span>
      <span class="chip">${esc(appelsSupabaseDirects)} appel Supabase en dur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Ce que le Lab 8 avait laissé</h2>
    <p>À la fin du Lab 8, l'application affichait la liste des événements, mais tout tenait dans un seul fichier <code>App.js</code> : impossible d'ouvrir un événement, impossible d'atteindre un écran de profil. Une application mobile a plusieurs écrans et une barre d'onglets pour circuler entre ses sections principales.</p>
    <p>Ce lab n'ajoute pas de logique métier. Il réorganise l'application en écrans, et le seul appel de données reste <code>getEvenements()</code> — réutilisé, cette fois, par deux écrans.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> Le système de fichiers est la configuration</h2>
    <p>Avec Expo Router, on ne déclare plus de routes dans du code : chaque fichier du dossier <code>app/</code> devient un écran, et un fichier <code>_layout.js</code> décide comment ses voisins s'articulent. Deux conventions de nommage suffisent : les parenthèses de <code>(tabs)</code> créent un <b>groupe</b> qui n'ajoute rien à l'URL (l'onglet liste reste à <code>/</code>), et les crochets de <code>[id]</code> déclarent un <b>paramètre</b>.</p>
    <table>
      <thead><tr><th>Besoin</th><th>Web — Lab 4 (React Router)</th><th>Mobile — Lab 9 (Expo Router)</th></tr></thead>
      <tbody>${corrHtml}</tbody>
    </table>
    <p style="margin-top:10px">La dernière ligne est la même des deux côtés : c'est l'architecture du cours qui tient. La seule idée réellement nouvelle est que la configuration passe par l'arborescence plutôt que par du JSX.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> Deux navigateurs imbriqués : Stack et Tabs</h2>
    <p>Le layout racine est un <code>Stack</code> : les écrans s'empilent, avec un retour automatique. Il contient le groupe des onglets et l'écran de détail — toucher une carte pousse le détail <i>au-dessus</i> des onglets. C'est aussi le premier fichier exécuté : il prend le rôle d'initialisation de Supabase qu'avait <code>App.js</code>.</p>
    <p class="code-label">apps/mobile/app/_layout.js</p>
    <pre>${esc(layoutRacine)}</pre>
    <p>Le groupe <code>(tabs)</code> a son propre layout, un navigateur <code>Tabs</code>. Les icônes viennent de <code>@expo/vector-icons</code> ; la fonction <code>tabBarIcon</code> reçoit la couleur et l'état de l'onglet, ce qui permet d'afficher la version pleine de l'icône quand l'onglet est actif.</p>
    <p class="code-label">apps/mobile/app/(tabs)/_layout.js — un onglet</p>
    <pre>${esc(layoutOnglets)}</pre>
    <p>L'onglet Événements masque l'en-tête du navigateur pour garder l'en-tête de marque du Lab 8 (dégradé et compteur). C'est donc à lui de laisser la place à l'encoche : il lit la hauteur avec <code>useSafeAreaInsets</code>, qui fonctionne sur iOS comme sur Android, là où le Lab 8 compensait la barre d'état Android à la main.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">04</span> La carte devient un lien</h2>
    <p><code>&lt;Link href&gt;</code> est le pendant du <code>&lt;Link to&gt;</code> du web, et le chemin se construit de la même façon. Avec <code>asChild</code>, <code>Link</code> ne dessine rien : il transmet son comportement de navigation à son enfant, un <code>Pressable</code>, et toute la carte devient touchable.</p>
    <pre>${esc(carteLien)}</pre>
    <p>Un piège rencontré ici : <code>Link</code> fusionne les styles de son enfant comme des objets. Un style écrit sous forme de fonction, <code>style={({ pressed }) =&gt; …}</code>, serait silencieusement perdu. Le retour visuel du toucher passe donc par une fonction <i>enfant</i> du <code>Pressable</code>, qui reçoit le même état <code>pressed</code>.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> L'écran de détail lit son paramètre</h2>
    <p>Le nom <code>[id].js</code> déclare le paramètre ; <code>useLocalSearchParams()</code> le lit — l'exact pendant de <code>useParams()</code>. La valeur est toujours une chaîne : <code>/evenement/3</code> donne <code>"3"</code>, d'où le <code>Number(id)</code> avant de comparer.</p>
    <pre>${esc(detailParam)}</pre>
    <p>Au Lab 4, la page Détail recevait le tableau en prop. Ici chaque écran est indépendant et ne reçoit pas l'état de l'onglet liste : il rappelle donc la fonction partagée et cherche l'événement. Le parcours mesuré le confirme : l'ouverture du détail ajoute exactement ${esc(p.detail.requetesSupplementaires)} requête. Trois états sont traités : chargement, erreur réseau, et identifiant inconnu (figure 05).</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">06</span> Bonus : naviguer par code</h2>
    <p><code>useRouter</code> est l'équivalent de <code>useNavigate</code>. Le sujet propose <code>router.push("/")</code> pour le bouton « Retour à la liste ». Dans Expo Router 6, <code>push</code> émet toujours une action <code>PUSH</code> : on empilerait une seconde copie des onglets par-dessus le détail, et la flèche retour ramènerait… au détail. On utilise <code>dismissTo("/")</code>, qui dépile jusqu'à la liste — ou la met à la place du détail si on est arrivé par un lien direct.</p>
    <pre>${esc(bonus)}</pre>
    <p>Le parcours le vérifie : après le bouton, l'application est sur <code>${esc(p.bonus.chemin)}</code> et il reste ${esc(p.bonus.flechesApres)} flèche retour visible — la pile est propre.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Metro et les dépendances d'expo-router</h2>
    <p>Le sujet indique que le <code>metro.config.js</code> du Lab 8 reste valable. Dans ce dépôt, ce n'était pas le cas : le premier bundle a échoué sur <code>Unable to resolve module @expo/metro-runtime</code>. npm a rangé plusieurs dépendances d'expo-router dans des <code>node_modules</code> imbriqués (<code>expo-router/node_modules/@react-navigation/bottom-tabs/node_modules/…</code>), que le réglage <code>disableHierarchicalLookup</code> du Lab 8 empêchait de voir.</p>
    <p>Réactiver simplement la recherche hiérarchique aurait été pire : la racine du monorepo contient d'autres versions de <code>react</code> et <code>react-native</code>, et les paquets hissés comme <code>react-native-screens</code> les auraient trouvées — deux React dans le même bundle. La règle retenue :</p>
    <pre>${esc(metroRegle)}</pre>
    <p>Le contrôle est fait sur la sourcemap du bundle Android : <code>react</code> vient uniquement de <code>${esc(android.react.join(", "))}</code> et <code>react-native</code> de <code>${esc(android.reactNative.join(", "))}</code>.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> Structure livrée</h2>
    <pre>${esc(arbre)}</pre>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">09</span> Ce que la validation a réellement donné</h2>
    <p>Les vérifications de l'enseignant (section 9.2) et les bundles natifs, relancés au moment de générer ce rapport :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(preuves)}</tbody>
    </table>
    <p style="margin-top:12px">Le parcours de navigation, piloté par <code>apps/mobile/capture-lab9.mjs</code> sur l'application réelle et la vraie base :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(navigation)}</tbody>
    </table>
    <p style="margin-top:10px">Le lab compte ${commitsLab.length} commits depuis <code>v0.8-expo</code>, dans l'ordre de merge imposé : installation du routeur et configuration (A), onglets (B), détail et cartes cliquables (C), puis le bonus.</p>
  </section>

  <section>
    <h2><span class="sec-n">10</span> L'application, en situation</h2>
    <p>Captures au format téléphone, avec la vraie base. C'est le même dossier <code>app/</code> que celui exécuté dans Expo Go, rendu sur la cible web d'Expo pour pouvoir piloter le parcours par script — avec un bénéfice propre à Expo Router : chaque écran a une URL, visible en tête de chaque figure.</p>
    <div class="grille-shots">${figuresHtml}</div>
  </section>

  <section class="callout">
    <h2>Vers le Lab 10</h2>
    <p>L'application a maintenant une vraie navigation, mais elle est en lecture seule. Au Lab 10, dernier lab mobile, l'onglet Profil accueillera la connexion (<code>seConnecter</code>, <code>sInscrire</code>, <code>seDeconnecter</code>), un écran de création utilisera <code>creerEvenement</code>, et l'écran de détail recevra le bouton d'inscription (<code>inscrire</code>, <code>desinscrire</code>) — toujours depuis le package partagé.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 9 — Expo Router et navigation mobile</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab9.html`, html);
writeFileSync(`${RACINE}/rapport-lab9.html`, html);
console.log("rapport-lab9.html ecrit,", html.length, "caracteres");
console.log({ android, ios, echecs: [...preuves, ...navigation].filter((r) => !r[3]).map((r) => r[0]) });
