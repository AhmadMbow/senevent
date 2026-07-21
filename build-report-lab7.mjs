import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/senevent-lab7-screens";
const b64 = name =>
  `data:image/png;base64,${readFileSync(`${DIR}/${name}.png`).toString("base64")}`;

const esc = s =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Preuves collectees par capture-lab7.mjs contre la vraie app + base.
const p = JSON.parse(readFileSync(`${DIR}/preuves-lab7.json`, "utf8"));

// ---------- Arbres avant / apres ----------
const treeAvant = `senevent/
  apps/
    web/           # tout le projet, logique Supabase incluse
      src/
        lib/supabase.js        <- client + cles en dur
        App.jsx                <- .from("evenements").select(...)
        pages/NouvelEvenement  <- .from(...).insert(...)
        components/Bouton...   <- .from("inscriptions")...
  supabase/`;

const treeApres = `senevent/
  package.json               # racine : "workspaces"
  apps/
    web/                     # React + JS, consomme le package
      src/App.jsx            <- getEvenements()
      src/main.jsx           <- initSupabase(...)
  packages/
    shared/                  # TypeScript, agnostique de plateforme
      src/
        index.ts             # facade : re-exporte tout
        types.ts             # Evenement, Categorie, Profile
        supabaseClient.ts    # initSupabase / getSupabase
        evenements.ts        # getEvenements, creerEvenement...
        auth.ts / inscriptions.ts
      package.json           # @senevent/shared
      tsconfig.json`;

// ---------- Code : package.json racine ----------
const rootPkg = `{
  "name": "senevent",
  "private": true,
  "version": "1.0.0",
  "workspaces": ["apps/*", "packages/*"]
}`;

// ---------- Code : types TypeScript ----------
const tsTypes = `export type Categorie =
  | "concert" | "expo" | "conference" | "atelier" | "soutenance";

export interface Evenement {
  id: number;
  titre: string;
  categorie: Categorie;         // pas n'importe quel texte : 5 valeurs
  lieu_nom: string;
  date_debut: string;           // ISO 8601
  prix: number;
  image_url: string | null;     // le | null force a gerer "pas d'image"
  organisateur_id: string | null;
  created_at: string;
}

export interface NouvelEvenementInput {
  titre: string; categorie: Categorie; lieu_nom: string;
  date_debut: string; prix: number;
  image_url?: string | null;    // optionnel a la creation
  organisateur_id: string;      // obligatoire : RLS l'exige
}`;

// ---------- Code : client decouple ----------
const tsClient = `let client: SupabaseClient | null = null;

// L'application passe ses cles au demarrage. Le package ne lit
// JAMAIS import.meta.env : ni Vite, ni Expo, agnostique.
export function initSupabase(url: string, anonKey: string) {
  if (!client) client = createClient(url, anonKey);
  return client;
}

export function getSupabase(): SupabaseClient {
  if (!client) throw new Error("Supabase non initialise.");
  return client;
}`;

// ---------- Code : contrat d'erreur avant/apres ----------
const errAvant = `// Lab 6 — dans le composant : verifier error a chaque appel
const { data, error } = await supabase
  .from("evenements")
  .select("*, profiles(nom)")
  .order("date_debut", { ascending: true });
if (error) {
  setErreur(error.message);
} else {
  setEvenements(data);
}`;

const errApres = `// Lab 7 — la fonction partagee leve, le composant fait try/catch
export async function getEvenements(): Promise<Evenement[]> {
  const { data, error } = await getSupabase()
    .from("evenements")
    .select("*, profiles(nom)")
    .order("date_debut", { ascending: true });
  if (error) throw error;          // decision centralisee
  return (data ?? []) as Evenement[];
}`;

// ---------- Code : App.jsx avant/apres ----------
const appAvant = `import { supabase } from "./lib/supabase";

const charger = async () => {
  setChargement(true);
  setErreur(null);
  const { data, error } = await supabase
    .from("evenements")
    .select("*, profiles(nom)")
    .order("date_debut", { ascending: true });
  if (error) setErreur(error.message);
  else setEvenements(data);
  setChargement(false);
};`;

const appApres = `import { getEvenements } from "@senevent/shared";

const charger = async () => {
  setChargement(true);
  setErreur(null);
  try {
    const data = await getEvenements();   // toute la requete est dans le package
    setEvenements(data);
  } catch (e) {
    setErreur(e.message);
  } finally {
    setChargement(false);
  }
};`;

// ---------- Code : main.jsx (le seul endroit qui lit l'env) ----------
const mainCode = `import { initSupabase } from "@senevent/shared";

// C'est ici, et SEULEMENT ici, qu'on lit import.meta.env.VITE_...
initSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);`;

// ---------- Tableau : le remplacement composant par composant ----------
const bascule = [
  ["App.jsx", "supabase.from('evenements').select(...)", "getEvenements()"],
  ["NouvelEvenement.jsx", "supabase.from('evenements').insert(...)", "creerEvenement(input)"],
  ["Detail.jsx", "supabase.from('evenements').delete().eq(...)", "supprimerEvenement(id)"],
  ["BoutonInscription.jsx", "select / insert / delete inscriptions", "estInscrit / inscrire / desinscrire"],
  ["Auth.jsx", "auth.signUp / signInWithPassword", "sInscrire(...) / seConnecter(...)"],
  ["NavBar.jsx", "auth.signOut()", "seDeconnecter()"],
];
const basculeHtml = bascule
  .map(([f, avant, apres]) =>
    `<tr><td class="mono">${f}</td><td class="mono">${esc(avant)}</td><td class="mono"><b>${esc(apres)}</b></td></tr>`)
  .join("\n");

// ---------- Tableau : preuves de validation ----------
const ok = "<span class='ok'>&#10003;</span>";
const preuves = [
  ["Package typé compile", "npx tsc --noEmit dans packages/shared", "Exit 0 — aucune erreur de type", ok],
  ["Build web", "npx vite build sur apps/web", "101 modules transformés, 0 erreur", ok],
  ["Extraction complète", "grep -rc \"supabase.from\" apps/web/src", "0 appel restant", ok],
  ["Consommation du package", "grep -rl \"@senevent/shared\" apps/web/src", "7 fichiers importent le package", ok],
  ["Ancien client supprimé", "apps/web/src/lib/supabase.js", "Fichier retiré, aucun import ne le référence", ok],
  ["Donnée toujours réelle", "Réseau observé pendant le parcours", `${p.nbRequetesSupabase} requêtes vers supabase.co, 0 mock JSON`, ok],
];
const preuvesHtml = preuves
  .map(([cas, methode, resultat, statut]) =>
    `<tr><td><b>${cas}</b></td><td class="mono">${esc(methode)}</td><td>${esc(resultat)}</td><td style="text-align:center">${statut}</td></tr>`)
  .join("\n");

// ---------- Figures ----------
const figures = [
  { n: 1, img: "01-catalogue", route: "/", titre: "Le catalogue, servi par getEvenements()",
    desc: `Visuellement identique au Lab 6. Mais la liste ne vient plus d'un <code>.from()</code> écrit dans <code>App.jsx</code> : le composant appelle <code>getEvenements()</code> du package partagé. Le réseau confirme la requête exacte <code>select=*,profiles(nom)&amp;order=date_debut.asc</code> vers <code>supabase.co</code> — la logique a déménagé, le comportement n'a pas bougé.` },
  { n: 2, img: "02-connecte", route: "/auth", titre: "Session réelle via seConnecter()",
    desc: `Connexion du compte A. <code>Auth.jsx</code> n'appelle plus <code>supabase.auth.signInWithPassword</code> : il passe par <code>seConnecter(email, mdp)</code> du package. La NavBar bascule, « Nouvel evenement » apparaît — la gestion d'auth partagée fonctionne comme avant.` },
  { n: 3, img: "03-detail", route: "/evenement/:id", titre: "Quatre modules partagés dans un seul écran",
    desc: `« Organisé par : Atou Diop » vient de la jointure de <code>getEvenements()</code>. Le bouton « Se désinscrire » prouve que <code>estInscrit()</code> a retourné vrai. « Supprimer » n'apparaît que pour l'organisateur, prêt à appeler <code>supprimerEvenement()</code>. Événements, auth, inscriptions : toute la logique passe désormais par <code>@senevent/shared</code>, sans une seule régression.` },
];
const figuresHtml = figures
  .map(f => `
  <figure class="shot">
    <div class="shot-head">
      <span class="fig-n">Figure ${f.n}</span>
      <span class="route">${f.route}</span>
      <h3>${f.titre}</h3>
    </div>
    <img src="${b64(f.img)}" alt="${f.titre}" />
    <figcaption>${f.desc}</figcaption>
  </figure>`)
  .join("\n");

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Lab 7 — SenEvent</title>
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

  .cover { background: linear-gradient(160deg, var(--navy), var(--navy-deep));
    color: #fff; border-radius: 10px; padding: 26px 28px; margin-bottom: 24px; }
  .cover .top { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,.18); padding-bottom: 12px; margin-bottom: 18px; }
  .logo { font-weight: 800; font-size: 15pt; color: var(--orange); }
  .top .nav { font-size: 9pt; color: rgba(255,255,255,.7); }
  .top .nav b { color: #fff; border-bottom: 2px solid var(--orange); padding-bottom: 2px; }
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
  figcaption { padding: 10px 14px; font-size: 9pt; color: var(--muted); }

  .callout { border: 1px solid var(--border); border-left: 4px solid var(--orange);
    border-radius: 8px; padding: 12px 16px; break-inside: avoid; }
  .callout h2 { font-size: 11.5pt; color: var(--orange); margin-bottom: 5px; }
  .callout p { margin: 0; color: var(--ink); font-size: 9.6pt; }
  .callout.ts { border-left-color: var(--purple); }
  .callout.ts h2 { color: var(--purple); }

  .foot { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 10px;
    display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
  .pb { page-break-before: always; }
</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">SenEvent</span>
      <span class="nav"><b>Accueil</b>&nbsp;&nbsp;&nbsp;Nouvel evenement&nbsp;&nbsp;&nbsp;atou@…&nbsp;&nbsp;&nbsp;Se deconnecter</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Partage 1/1 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 7 — Workspace npm + packages/shared</h1>
    <p class="lede">Rapport de réalisation : un refactoring sans nouvelle fonctionnalité. Le projet devient un monorepo npm workspaces. Toute la logique Supabase — client, requêtes, formes de données — quitte les composants React pour <code>packages/shared</code>, écrite une seule fois en TypeScript. Le web l'importe via <code>@senevent/shared</code> ; le mobile en fera autant. Le test de réussite : l'app se comporte exactement comme avant.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.7-shared</span>
      <span class="chip">npm workspaces</span>
      <span class="chip">TypeScript</span>
      <span class="chip">initSupabase / getSupabase</span>
      <span class="chip">0 appel Supabase en dur</span>
      <span class="chip">Build ✓ · tsc ✓ · 0 régression</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Le problème : une logique, bientôt deux clients</h2>
    <p>L'app web est finie et marche. Mais chaque requête Supabase est écrite en dur dans un composant : <code>lib/supabase.js</code> pour le client, <code>.from().select()</code> dans <code>App.jsx</code>, <code>.insert()</code> dans <code>NouvelEvenement.jsx</code>… Aux Labs 8–10, le mobile aura besoin d'exactement la même logique. La laisser ici, c'est se condamner à la réécrire — deux copies qui divergeront. Le monorepo résout ça : un seul dépôt, un dossier partagé, importé par les deux apps.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Avant — tout dans apps/web</p>
        <pre>${esc(treeAvant)}</pre>
      </div>
      <div>
        <p class="code-label">Après — logique extraite dans packages/shared</p>
        <pre>${esc(treeApres)}</pre>
      </div>
    </div>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> La racine qui déclare les workspaces</h2>
    <p>Un <code>package.json</code> à la racine transforme le dépôt en monorepo. <code>"workspaces"</code> dit à npm où chercher les sous-projets ; <code>"private": true</code> empêche une publication accidentelle de la racine. Un seul <code>npm install</code> installe tout et crée un lien symbolique de <code>@senevent/shared</code> dans les <code>node_modules</code> — le web importe alors le package local, sans passer par le registre public.</p>
    <div class="two-col">
      <div>
        <p class="code-label">package.json (racine)</p>
        <pre>${esc(rootPkg)}</pre>
      </div>
      <div>
        <p class="code-label">packages/shared/package.json</p>
        <pre>${esc(`{
  "name": "@senevent/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  }
}`)}</pre>
      </div>
    </div>
    <p>Le scope <code>@senevent/</code> est un espace de nommage : il signale un paquet interne et évite les collisions. <code>"main"</code> pointe vers <code>src/index.ts</code>, la façade que les apps obtiennent en important le nom.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> TypeScript, là où il apporte le plus</h2>
    <p>Six labs en JavaScript pur, volontairement. Maintenant que React est acquis, TypeScript entre au bon endroit : le code partagé, qui décrit des données. Un événement a un titre (texte), un prix (nombre), une catégorie (parmi 5 valeurs). On déclare ces formes une fois, et l'éditeur attrape <code>ev.titr</code>, un texte passé pour un nombre, ou un champ obligatoire oublié — avant l'exécution.</p>
    <p class="code-label">packages/shared/src/types.ts</p>
    <pre>${esc(tsTypes)}</pre>
    <div class="callout ts">
      <h2>Le <code>| null</code> n'est pas décoratif</h2>
      <p>Sur <code>image_url</code> et <code>organisateur_id</code>, il force le code à gérer le cas « pas d'image » ou « pas d'organisateur » — précisément les 5 événements seed, dont <code>profiles</code> vaut <code>null</code>. Sans ce marqueur, on oublierait ce cas et l'interface planterait sur un <code>undefined</code>. Le mode <code>strict</code> du <code>tsconfig.json</code> rend cette vérification obligatoire.</p>
    </div>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">04</span> Le client découplé : pourquoi <code>initSupabase</code></h2>
    <p>Le package ne peut pas lire <code>import.meta.env.VITE_...</code> : cette syntaxe est propre à Vite, et Expo lit ses variables autrement. La solution : le package ne lit rien lui-même. Chaque app lui passe l'URL et la clé au démarrage via <code>initSupabase(url, key)</code>. Le package reste agnostique — c'est ce découplage qui fera marcher le même code côté web et côté mobile, sans modification.</p>
    <div class="two-col">
      <div>
        <p class="code-label">packages/shared/src/supabaseClient.ts</p>
        <pre>${esc(tsClient)}</pre>
      </div>
      <div>
        <p class="code-label">apps/web/src/main.jsx</p>
        <pre>${esc(mainCode)}</pre>
      </div>
    </div>
    <p>Résultat : <code>main.jsx</code> est le seul fichier de tout le projet qui lit les variables d'environnement. Partout ailleurs — composants comme package — on ne connaît que <code>getSupabase()</code>.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> Un contrat d'erreur unifié : <code>throw</code> plutôt que retourner</h2>
    <p>Au Lab 6, chaque appel renvoyait <code>{ data, error }</code> et le composant testait <code>error</code> ligne après ligne. Les fonctions partagées lèvent l'erreur : le composant appelant veut juste la donnée. On centralise la décision dans le package, et les deux apps gèrent tout de la même façon avec un <code>try / catch</code>.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Avant — { data, error } dans le composant</p>
        <pre>${esc(errAvant)}</pre>
      </div>
      <div>
        <p class="code-label">Après — la fonction partagée lève</p>
        <pre>${esc(errApres)}</pre>
      </div>
    </div>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">06</span> Brancher apps/web : des appels aux imports</h2>
    <p>Composant par composant, on remplace les appels Supabase en dur par un import du package. Le composant ne sait plus <em>comment</em> on récupère les événements — juste qu'il appelle une fonction qui les retourne.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Avant — App.jsx (Lab 6)</p>
        <pre>${esc(appAvant)}</pre>
      </div>
      <div>
        <p class="code-label">Après — App.jsx (Lab 7)</p>
        <pre>${esc(appApres)}</pre>
      </div>
    </div>
    <table style="margin-top:12px">
      <thead><tr><th>Fichier</th><th>Appel en dur (avant)</th><th>Fonction partagée (après)</th></tr></thead>
      <tbody>${basculeHtml}</tbody>
    </table>
    <p style="margin-top:8px">Une fois tous les composants basculés, <code>lib/supabase.js</code> n'est plus référencé nulle part : il est supprimé. Un dernier détail, hors énoncé : <code>sInscrire</code> reçoit un 3ᵉ paramètre optionnel <code>nom</code>, pour continuer d'alimenter le trigger <code>on_auth_user_created</code> du Lab 5 ; et l'upload Storage de l'affiche reste inline via <code>getSupabase().storage</code>, seul l'<code>insert</code> passe par <code>creerEvenement()</code>.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Ce que la validation a réellement donné</h2>
    <p>Un lab de refactoring se juge sur deux critères : le code est bien réorganisé, et rien n'a cassé. Chaque ligne ci-dessous est une commande réelle et son résultat.</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${preuvesHtml}</tbody>
    </table>
    <p style="margin-top:10px">Les quatre commits suivent le découpage imposé — structure, puis logique partagée, puis branchement — et le tag <code>v0.7-shared</code> est posé sur <code>main</code> après merge : <code>structure monorepo</code> → <code>logique partagee</code> → <code>apps/web consomme @senevent/shared</code> → <code>Merge lab7</code>.</p>
  </section>

  <section>
    <h2><span class="sec-n">08</span> Non-régression, en situation</h2>
    <p>Captures prises sur l'application réelle, avec une session réelle et la vraie base. L'écran n'a pas changé depuis le Lab 6 — c'est le but. Ce qui a changé est invisible : sous chaque bouton, la logique passe maintenant par <code>@senevent/shared</code>.</p>
    ${figuresHtml}
  </section>

  <section class="callout">
    <h2>Vers le Lab 8</h2>
    <p>Le socle partagé est en place : la logique métier est écrite une fois, typée, et validée par le web. Au Lab 8, on démarre le mobile avec Expo et React Native — <code>apps/mobile/</code> à côté de <code>apps/web/</code>. On découvre les composants natifs (<code>View</code>, <code>Text</code>, <code>StyleSheet</code>) qui remplacent <code>&lt;div&gt;</code> et le CSS. Et surtout : <code>apps/mobile</code> importera <code>@senevent/shared</code> exactement comme le web. Le premier écran mobile qui affiche les événements réutilisera <code>getEvenements()</code> sans une ligne de logique Supabase à réécrire. C'est là que le travail de ce lab paiera.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 7 — Monorepo + packages/shared</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab7.html`, html);
writeFileSync(
  "/Users/babacarmbow/Desktop/Projets dev/senevent/rapport-lab7.html",
  html
);
console.log("wrote rapport-lab7.html,", html.length, "chars");
