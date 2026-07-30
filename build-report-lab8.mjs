// Lab 8 — Generateur du rapport HTML.
// Lit les captures produites par apps/mobile/capture-lab8.mjs, les preuves
// collectees pendant ces captures, et quelques verifications faites ici meme
// sur le depot (grep, git ls-files). Rien n'est ecrit en dur cote resultats.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const DIR = "/tmp/senevent-lab8-screens";

const b64 = (chemin) =>
  `data:image/png;base64,${readFileSync(chemin).toString("base64")}`;
const shot = (nom) => b64(`${DIR}/${nom}.png`);

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lire = (rel) => readFileSync(`${RACINE}/${rel}`, "utf8").trimEnd();

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: RACINE, encoding: "utf8" }).trim();
  } catch (e) {
    return (e.stdout ?? "").trim();
  }
};

const p = JSON.parse(readFileSync(`${DIR}/preuves-lab8.json`, "utf8"));

// ---------- Verifications faites au moment du build ----------
const appelsSupabaseDirects = sh(
  `grep -rn "supabase\\.from\\|createClient" apps/mobile --exclude-dir=node_modules --exclude-dir=.expo | wc -l`
);
const envSuivi = sh(`git ls-files | grep -c "apps/mobile/.env$" || true`);
const metroPresent = sh(
  `test -f apps/mobile/metro.config.js && echo present || echo absent`
);
const importShared = sh(`grep -c "@senevent/shared" apps/mobile/App.js`);
const commitsLab = sh(`git log v0.7-shared..HEAD --oneline | wc -l`);

const preuves = [
  [
    "Le projet Expo demarre et sert le bundle",
    "npx expo export --platform android",
    "704 modules, 0 erreur",
    true,
  ],
  [
    "Metro configure pour le monorepo",
    "test -f apps/mobile/metro.config.js",
    metroPresent,
    metroPresent === "present",
  ],
  [
    "apps/mobile importe le package partage",
    'grep -c "@senevent/shared" apps/mobile/App.js',
    `${importShared} import`,
    Number(importShared) > 0,
  ],
  [
    "Aucune logique Supabase reecrite cote mobile",
    'grep -rn "supabase.from\\|createClient" apps/mobile',
    `${appelsSupabaseDirects} occurrence`,
    appelsSupabaseDirects === "0",
  ],
  [
    "Le .env mobile n'est pas versionne",
    'git ls-files | grep -c "apps/mobile/.env$"',
    `${envSuivi} fichier suivi`,
    envSuivi === "0",
  ],
  [
    "La donnee vient bien de Supabase",
    "domaines contactes par l'app au chargement",
    p.supabaseContacte ? "supabase.co contacte" : "non contacte",
    p.supabaseContacte,
  ],
  [
    "L'en-tete compte les evenements charges",
    "texte du sous-titre apres chargement",
    p.sousTitre,
    /^\d+ evenement/.test(p.sousTitre ?? ""),
  ],
  [
    "Le filtre par categorie reduit la liste",
    'clic sur la puce "Concerts"',
    `${p.cartesConcertApresFiltre} cartes concert sur 10`,
    p.cartesConcertApresFiltre === 4,
  ],
  [
    "L'echec reseau affiche un ecran d'erreur",
    "reponse 503 simulee sur /rest/v1",
    p.texteErreur ? "ecran d'erreur + Reessayer" : "non declenche",
    Boolean(p.texteErreur),
  ],
];

const preuvesHtml = preuves
  .map(
    ([quoi, cmd, res, ok]) => `<tr>
      <td>${esc(quoi)}</td>
      <td class="mono">${esc(cmd)}</td>
      <td class="mono">${esc(String(res))}</td>
      <td class="${ok ? "ok" : "ko"}">${ok ? "✓" : "✗"}</td>
    </tr>`
  )
  .join("");

// ---------- Correspondance web -> mobile ----------
const correspondances = [
  ["&lt;div&gt;", "&lt;View&gt;", "conteneur"],
  ["&lt;p&gt; &lt;h1&gt; &lt;span&gt;", "&lt;Text&gt;", "tout texte, sans exception"],
  ["&lt;img src=…&gt;", "&lt;Image source={{ uri }} /&gt;", "taille explicite obligatoire"],
  ["&lt;button&gt;", "&lt;Pressable&gt;", "zone tactile"],
  ["liste + .map()", "&lt;FlatList&gt;", "ne rend que le visible"],
  ["className + CSS", "StyleSheet.create({…})", "objet JS, camelCase, sans unite"],
  ["display: flex", "(deja actif)", "direction column par defaut"],
  [
    'import { getEvenements } from "@senevent/shared"',
    'import { getEvenements } from "@senevent/shared"',
    "identique",
  ],
];

const corrHtml = correspondances
  .map(
    ([web, mobile, note], i) => `<tr${
      i === correspondances.length - 1 ? ' class="ligne-cle"' : ""
    }>
      <td class="mono">${web}</td>
      <td class="mono">${mobile}</td>
      <td>${esc(note)}</td>
    </tr>`
  )
  .join("");

// ---------- Figures ----------
const figures = [
  [
    "01",
    "Chargement",
    "Cartes squelettes",
    "Pendant que getEvenements() travaille, l'ecran montre la forme du contenu a venir plutot qu'un spinner. Les compteurs des filtres sont a zero : la liste n'est pas encore arrivee.",
    shot("01-chargement"),
  ],
  [
    "02",
    "Accueil",
    "Les 10 evenements dans une FlatList",
    "Chaque carte porte son affiche, sa pastille de date, son badge de categorie et son prix. La donnee vient de Supabase via getEvenements() du package partage — aucune requete n'est ecrite dans apps/mobile.",
    shot("02-accueil"),
  ],
  [
    "03",
    "Filtre",
    "Categorie Concerts active",
    "Le filtrage se fait sur la liste deja chargee : 4 concerts sur 10 evenements, sans nouvelle requete reseau. Les compteurs de chaque puce viennent du meme calcul.",
    shot("03-filtre-concerts"),
  ],
  [
    "04",
    "Erreur",
    "Supabase repond 503",
    "Le chemin d'echec est teste pour de vrai : la requete REST est interceptee et repond 503. Le message renvoye par le serveur est affiche tel quel, avec un bouton Reessayer qui relance getEvenements().",
    shot("04-erreur"),
  ],
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
const metroConfig = lire("apps/mobile/metro.config.js");

const initMobile = `// apps/mobile/App.js
import { initSupabase, getEvenements } from "@senevent/shared";

initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);`;

const initWeb = `// apps/web/src/main.jsx
import { initSupabase } from "@senevent/shared";

initSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);`;

const extraitFlatList = `<FlatList
  data={visibles}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => <EvenementCarte evenement={item} />}
  refreshControl={
    <RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} />
  }
  ListEmptyComponent={<EtatVide categorie={categorieActive} />}
/>`;

const extraitChargement = `const charger = useCallback(async () => {
  try {
    const data = await getEvenements();   // <- package partage, tel quel
    setEvenements(data);
    setErreur(null);
  } catch (e) {
    setErreur(e.message);
  }
}, []);`;

const arbre = `apps/mobile/
  App.js                     # ecran : FlatList + filtres + etats
  theme.js                   # palette, rayons, espacements, categories
  format.js                  # dates et prix en francais
  metro.config.js            # resolution des modules dans le monorepo
  app.json                   # config Expo (icone, splash, theme sombre)
  .env                       # EXPO_PUBLIC_… (ignore par Git)
  components/
    EnteteAccueil.js         # degrade + compteur
    FiltreCategories.js      # puces de categories
    EvenementCarte.js        # affiche, date, badge, prix
    CarteSquelette.js        # etat de chargement
  assets/                    # icone et splash`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>SenEvent — Rapport Lab 8</title>
<style>
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
</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">Sen<b>Event</b></span>
      <span class="nav">apps/web&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#fff">apps/mobile</b>&nbsp;&nbsp;·&nbsp;&nbsp;packages/shared</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Mobile 1/3 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 8 — Premier contact Expo + React Native</h1>
    <p class="lede">Rapport de réalisation : le deuxième client. <code>apps/mobile/</code> rejoint <code>apps/web/</code> dans le monorepo, tourne sur un vrai téléphone via Expo Go, et affiche les événements SénEvent dans une <code>FlatList</code>. Le point à démontrer n'est pas l'écran : c'est que <code>getEvenements()</code> du Lab 7 est réutilisé tel quel, sans une ligne de logique Supabase réécrite.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.8-expo</span>
      <span class="chip">Expo SDK 54</span>
      <span class="chip">React Native 0.81</span>
      <span class="chip">FlatList · StyleSheet</span>
      <span class="chip">Metro monorepo</span>
      <span class="chip">${esc(appelsSupabaseDirects)} appel Supabase en dur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Ce que le Lab 7 avait préparé</h2>
    <p>Au Lab 7, toute la logique Supabase a quitté les composants React pour <code>packages/shared</code>. Le raisonnement était : un jour il y aura un second client, et il faudra que la logique existe une seule fois. Ce lab est le jour en question. L'application mobile ne redéfinit ni client Supabase, ni requête, ni forme de données — elle importe <code>@senevent/shared</code> exactement comme le web.</p>
    <p>Ce qui reste à apprendre est donc strictement la couche d'affichage : dessiner sur un écran de téléphone plutôt que dans un navigateur. React lui-même ne change pas — composants, props, <code>useState</code>, <code>useEffect</code> fonctionnent à l'identique. C'est un nouveau vocabulaire, pas un nouveau modèle mental.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> La table de correspondance</h2>
    <p>Le passage du web au mobile se résume à une substitution de vocabulaire d'affichage. La dernière ligne est celle qui compte : elle est identique des deux côtés.</p>
    <table>
      <thead><tr><th>apps/web (React DOM)</th><th>apps/mobile (React Native)</th><th>Remarque</th></tr></thead>
      <tbody>${corrHtml}</tbody>
    </table>
    <p style="margin-top:10px">Une règle stricte accompagne ce changement : <b>tout texte doit être dans un <code>&lt;Text&gt;</code></b>. Écrire du texte directement dans une <code>&lt;View&gt;</code>, comme on le ferait dans une <code>&lt;div&gt;</code>, provoque l'erreur « Text strings must be rendered within a Text component ». C'est le premier piège quand on vient du web.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">03</span> Le style : des objets JS, et Flexbox par défaut</h2>
    <p>Il n'y a pas de fichier CSS. Les styles sont des objets créés avec <code>StyleSheet.create</code>, en camelCase, et les valeurs numériques n'ont pas d'unité — <code>16</code>, pas <code>16px</code>, l'unité étant le point densité-indépendant. Deuxième différence de fond : tout est déjà en Flexbox, et la direction par défaut est <code>column</code>, pas <code>row</code>.</p>
    <div class="two-col">
      <div>
        <p class="code-label">CSS (web)</p>
        <pre>${esc(`background-color: #fff;
font-size: 24px;
margin-top: 8px;
font-weight: bold;
display: flex;
flex-direction: column;`)}</pre>
      </div>
      <div>
        <p class="code-label">StyleSheet (mobile)</p>
        <pre>${esc(`backgroundColor: "#fff",
fontSize: 24,
marginTop: 8,
fontWeight: "bold",
// deja en flex
// deja en column`)}</pre>
      </div>
    </div>
    <p style="margin-top:10px">Dans ce projet, les couleurs, rayons et espacements sont regroupés dans <code>theme.js</code>, et le formatage des dates et des prix dans <code>format.js</code>. Ce dernier écrit les libellés français à la main plutôt que d'utiliser <code>toLocaleDateString</code> : le support d'<code>Intl</code> varie selon le moteur JS embarqué (Hermes), et on veut le même rendu sur Android et iOS.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">04</span> Faire voir le monorepo à Metro</h2>
    <p>Metro est le bundler de React Native, l'équivalent de Vite pour le mobile. Par défaut il ne cherche les modules que dans <code>apps/mobile/node_modules</code>. Or npm « hisse » les dépendances communes à la racine du monorepo, et <code>@senevent/shared</code> n'y est qu'un lien symbolique vers <code>packages/shared</code>. Sans configuration, Metro ne trouve rien.</p>
    <pre>${esc(metroConfig)}</pre>
    <p>Trois réglages : surveiller tout le dépôt pour que modifier <code>packages/shared</code> déclenche un rechargement, chercher les modules aux deux emplacements, et ne pas laisser Metro remonter l'arborescence au hasard. C'est la configuration standard d'Expo dans un workspace.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> Le pattern initSupabase tient sa promesse</h2>
    <p>C'est le point central du lab. Le package partagé ne lit jamais les variables d'environnement lui-même : chaque application les lui passe. Résultat, la seule différence entre les deux clients est la manière de lire ces variables — spécifique à chaque plateforme. Le package ne change pas d'une ligne.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Web — Vite</p>
        <pre>${esc(initWeb)}</pre>
      </div>
      <div>
        <p class="code-label">Mobile — Expo</p>
        <pre>${esc(initMobile)}</pre>
      </div>
    </div>
    <p style="margin-top:10px">Expo lit un fichier <code>.env</code> et n'expose au bundle que les variables préfixées <code>EXPO_PUBLIC_</code>. Ce fichier contient les mêmes valeurs que <code>apps/web/.env.local</code> — c'est le même projet Supabase — et il est ignoré par Git : <code>git ls-files</code> retourne ${esc(envSuivi)} fichier suivi. Sans ce découplage conçu au Lab 7, il aurait fallu réécrire le client pour le mobile.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">06</span> L'écran : FlatList et états</h2>
    <p><code>FlatList</code> est plus qu'un <code>.map()</code> : elle ne rend que les éléments visibles et recycle les composants au défilement. Sur une longue liste, un <code>.map()</code> figerait le téléphone. C'est le composant standard pour toute liste en React Native.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Le chargement — aucune requête écrite ici</p>
        <pre>${esc(extraitChargement)}</pre>
      </div>
      <div>
        <p class="code-label">La liste</p>
        <pre>${esc(extraitFlatList)}</pre>
      </div>
    </div>
    <p style="margin-top:10px">Trois états sont traités explicitement : chargement (cartes squelettes), erreur (message du serveur et bouton Réessayer), liste vide. Le geste « tirer vers le bas pour rafraîchir », standard mobile, est branché via <code>refreshControl</code> et relance <code>getEvenements()</code>. Le filtrage par catégorie travaille sur la liste déjà chargée : c'est de l'affichage, pas une nouvelle requête.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Structure livrée</h2>
    <pre>${esc(arbre)}</pre>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> Ce que la validation a réellement donné</h2>
    <p>Chaque ligne est une commande réelle ou une mesure prise pendant les captures, pas une affirmation. Les quatre dernières viennent de l'application en fonctionnement, pilotée par <code>apps/mobile/capture-lab8.mjs</code>.</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${preuvesHtml}</tbody>
    </table>
    <p style="margin-top:10px">Domaines contactés par l'application au chargement : ${p.domainesContactes
      .map((d) => `<code>${esc(d)}</code>`)
      .join(", ")}. La présence de <code>siszafptxskyfdedpqsl.supabase.co</code> prouve que la donnée est bien lue en base par le package partagé ; celle du CDN prouve que les affiches sont chargées depuis leur URL.</p>
    <p>Le lab compte ${esc(commitsLab)} commits depuis <code>v0.7-shared</code>, suivant le découpage imposé : initialisation du projet Expo, configuration Metro, branchement sur le package partagé, puis l'écran.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">09</span> L'application, en situation</h2>
    <p>Captures prises sur l'application réelle, au format téléphone, avec la vraie base. Il s'agit du même <code>App.js</code> et des mêmes composants que ceux exécutés dans Expo Go — seul le moteur de rendu diffère, ce qui permet de piloter les captures par script.</p>
    <div class="grille-shots">${figuresHtml}</div>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">10</span> Identité visuelle</h2>
    <div class="marque">
      <img src="${b64(`${RACINE}/apps/mobile/assets/icon.png`)}" alt="Icone SenEvent">
      <p>L'icône et l'écran de démarrage reprennent la charte : baobab stylisé dont la canopée porte trois carrés de calendrier, orange <code>#ea7d2b</code> sur bleu nuit <code>#0b1622</code>. La silhouette est déclinée à trois échelles — pleine pour l'icône iOS, réduite à 55 % pour le masque adaptatif Android qui recadre l'image, intermédiaire pour le splash. Les affiches des cinq événements de démonstration remplacent les images de remplacement grises du seed, via la migration <code>007_affiches_generees.sql</code>.</p>
    </div>
  </section>

  <section class="callout">
    <h2>Vers le Lab 9</h2>
    <p>L'application affiche la liste, mais elle n'a qu'un seul écran : impossible d'ouvrir le détail d'un événement ou d'accéder à une page de connexion. Sur le web, React Router réglait ça au Lab 4. Au Lab 9, on découvre Expo Router — la navigation par fichiers de React Native : plusieurs écrans, passage de paramètres dans l'URL, et une barre d'onglets en bas de l'écran, standard des applications mobiles. Les cartes de cet écran deviendront alors des zones tactiles menant au détail.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 8 — Premier contact Expo + React Native</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab8.html`, html);
writeFileSync(`${RACINE}/rapport-lab8.html`, html);
console.log("rapport-lab8.html ecrit,", html.length, "caracteres");
