import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/senevent-screens";
const b64 = name =>
  `data:image/png;base64,${readFileSync(`${DIR}/${name}.png`).toString("base64")}`;

const figures = [
  {
    n: "01",
    img: "01-accueil",
    url: "localhost:5173/",
    route: "/",
    titre: "Accueil — la liste des événements",
    desc: "La route <code>/</code> rend le composant <code>Accueil</code> : NavBar, barre de recherche et les 5 événements du mock <code>evenements.json</code> en grille de cartes. L'onglet « Accueil » est actif (soulignement orange via <code>NavLink</code>).",
  },
  {
    n: "02",
    img: "02-recherche",
    url: "localhost:5173/",
    route: "/",
    titre: "Filtrage en temps réel",
    desc: "En tapant « conf » dans la <code>SearchBar</code>, la liste se réduit instantanément à « Conference IA &amp; Developpement ». Le filtre est un état contrôlé, l'URL ne change pas.",
  },
  {
    n: "03",
    img: "03-formulaire-vide",
    url: "localhost:5173/nouveau",
    route: "/nouveau",
    titre: "Formulaire de création",
    desc: "La route <code>/nouveau</code> affiche <code>NouvelEvenement</code> : quatre champs contrôlés (titre, catégorie, lieu, prix). Chaque frappe pilote un <code>useState</code>.",
  },
  {
    n: "04",
    img: "04-validation-erreurs",
    url: "localhost:5173/nouveau",
    route: "/nouveau",
    titre: "Validation côté client",
    desc: "Soumission à vide : la validation bloque l'envoi et affiche les messages d'erreur en rouge (« titre ≥ 3 caractères », « lieu requis »). <code>event.preventDefault()</code> empêche le rechargement HTML.",
  },
  {
    n: "05",
    img: "05-formulaire-rempli",
    url: "localhost:5173/nouveau",
    route: "/nouveau",
    titre: "Formulaire valide, prêt à soumettre",
    desc: "Titre, lieu et prix (3000 FCFA) renseignés. Aucune erreur : la soumission va créer l'événement et rediriger.",
  },
  {
    n: "06",
    img: "06-accueil-apres-ajout",
    url: "localhost:5173/",
    route: "/",
    titre: "Redirection après ajout",
    desc: "Après <code>onAjouter</code>, <code>navigate(\"/\")</code> ramène à l'accueil. Le nouvel événement « Concert de fin d'annee » apparaît <strong>en tête de liste</strong> (ajout immuable en début de tableau).",
  },
  {
    n: "07",
    img: "07-detail",
    url: "localhost:5173/evenement/1",
    route: "/evenement/:id",
    titre: "Page de détail (route paramétrée)",
    desc: "Un clic sur une carte navigue vers <code>/evenement/1</code>. <code>useParams</code> lit l'<code>:id</code>, l'événement est retrouvé dans la liste et affiché en grand. Le bouton « Retour » appelle <code>navigate(-1)</code>.",
  },
  {
    n: "08",
    img: "08-404",
    url: "localhost:5173/nimportequoi",
    route: "*",
    titre: "Route 404 (bonus)",
    desc: "Toute URL non prévue tombe sur la route catch-all <code>path=\"*\"</code> → composant <code>NonTrouvee</code>. La NavBar reste visible car elle vit au-dessus de <code>&lt;Routes&gt;</code>.",
  },
];

const figuresHtml = figures
  .map(
    f => `
      <figure class="shot">
        <div class="frame">
          <div class="chrome">
            <span class="dots"><i></i><i></i><i></i></span>
            <span class="omnibox"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M8 1a4 4 0 0 0-4 4v2H3v8h10V7h-1V5a4 4 0 0 0-4-4Zm2 6H6V5a2 2 0 1 1 4 0v2Z"/></svg>${f.url}</span>
          </div>
          <img src="${b64(f.img)}" alt="${f.titre}" loading="lazy" />
        </div>
        <figcaption>
          <div class="cap-head">
            <span class="fig-n">Fig. ${f.n}</span>
            <span class="route">${f.route}</span>
          </div>
          <h3>${f.titre}</h3>
          <p>${f.desc}</p>
        </figcaption>
      </figure>`
  )
  .join("\n");

const checklist = [
  "<code>react-router-dom</code> v6 présent dans les dépendances",
  "<code>App.jsx</code> = orchestrateur : état partagé + <code>&lt;BrowserRouter&gt;</code> + les <code>&lt;Route&gt;</code>",
  "Dossier <code>src/pages/</code> : Accueil, NouvelEvenement, Detail (chacun son <code>.module.css</code>)",
  "NavBar séparée avec <code>NavLink</code> et style actif sur le lien courant",
  "Cartes cliquables → <code>/evenement/:id</code> sans rechargement",
  "Validation : titre &lt; 3 car., lieu vide et prix négatif refusés",
  "Après ajout : redirection vers <code>/</code>, événement en tête de liste",
  "<code>navigate(-1)</code> depuis le détail ramène à l'accueil",
  "Route 404 catch-all <code>path=\"*\"</code> (bonus) opérationnelle",
];

const checklistHtml = checklist
  .map(c => `<li><span class="tick" aria-hidden="true">✓</span><span>${c}</span></li>`)
  .join("\n");

const routes = [
  ["/", "Accueil", "Liste + SearchBar", "useState, useEffect"],
  ["/nouveau", "NouvelEvenement", "Formulaire + validation", "useState, useNavigate"],
  ["/evenement/:id", "Detail", "Fiche d'un événement", "useParams, useNavigate"],
  ["*", "NonTrouvee", "Page 404 (bonus)", "—"],
];

const routesHtml = routes
  .map(
    ([p, c, r, h]) =>
      `<tr><td><code>${p}</code></td><td>${c}</td><td>${r}</td><td class="mono">${h}</td></tr>`
  )
  .join("\n");

const style = `<style>
  :root {
    --navy: #1a3a5c;
    --navy-deep: #14304d;
    --orange: #ea7d2b;
    --red: #a01a1a;
    --green: #1f7a4d;
    --bg: #f4f6f9;
    --surface: #ffffff;
    --surface-2: #eef1f6;
    --border: #dfe4ec;
    --text: #1b2430;
    --muted: #5c6672;
    --shadow: 0 1px 2px rgba(20,48,77,.06), 0 8px 24px rgba(20,48,77,.08);
    --radius: 12px;
    --measure: 66ch;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --navy: #1f4470; --navy-deep: #14304d; --orange: #f39348;
      --bg: #0e151d; --surface: #16202b; --surface-2: #1c2836;
      --border: #28394a; --text: #e6ebf1; --muted: #97a5b5;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="light"] {
    --navy: #1a3a5c; --navy-deep: #14304d; --orange: #ea7d2b;
    --bg: #f4f6f9; --surface: #ffffff; --surface-2: #eef1f6;
    --border: #dfe4ec; --text: #1b2430; --muted: #5c6672;
    --shadow: 0 1px 2px rgba(20,48,77,.06), 0 8px 24px rgba(20,48,77,.08);
  }
  :root[data-theme="dark"] {
    --navy: #1f4470; --orange: #f39348;
    --bg: #0e151d; --surface: #16202b; --surface-2: #1c2836;
    --border: #28394a; --text: #e6ebf1; --muted: #97a5b5;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.35);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6; -webkit-font-smoothing: antialiased;
  }
  code, kbd, .mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
  code {
    background: var(--surface-2); color: var(--navy);
    padding: .12em .4em; border-radius: 5px; font-size: .86em;
    border: 1px solid var(--border);
  }
  @media (prefers-color-scheme: dark) { code { color: var(--orange); } }
  :root[data-theme="dark"] code { color: var(--orange); }
  :root[data-theme="light"] code { color: var(--navy); }
  kbd {
    background: var(--surface); border: 1px solid var(--border);
    border-bottom-width: 2px; border-radius: 5px; padding: .1em .45em; font-size: .82em;
  }

  article { max-width: 940px; margin: 0 auto; padding: 0 20px 72px; }

  /* Hero */
  .hero {
    background: linear-gradient(160deg, var(--navy) 0%, var(--navy-deep) 100%);
    color: #fff; border-radius: 0 0 var(--radius) var(--radius);
    margin: 0 -20px 44px; padding: 0 0 40px;
    box-shadow: var(--shadow);
  }
  .brand {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px; border-bottom: 1px solid rgba(255,255,255,.12);
  }
  .logo { font-weight: 800; font-size: 1.15rem; color: var(--orange); letter-spacing: -.01em; }
  .topnav { display: flex; gap: 22px; font-size: .92rem; color: rgba(255,255,255,.75); }
  .topnav .active { color: #fff; font-weight: 700; border-bottom: 2px solid var(--orange); padding-bottom: 3px; }
  .hero-body { padding: 34px 32px 0; }
  .eyebrow {
    margin: 0 0 14px; text-transform: uppercase; letter-spacing: .14em;
    font-size: .7rem; font-weight: 700; color: var(--orange);
  }
  .hero h1 {
    margin: 0 0 12px; font-size: clamp(1.9rem, 4.5vw, 2.9rem);
    line-height: 1.08; font-weight: 800; letter-spacing: -.02em; text-wrap: balance;
  }
  .lede { margin: 0 0 22px; max-width: 60ch; color: rgba(255,255,255,.82); font-size: 1.05rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    font-size: .78rem; font-weight: 600; padding: 5px 11px; border-radius: 999px;
    background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); color: #fff;
  }
  .chip-tag { background: var(--orange); border-color: var(--orange); color: #1c1206; font-weight: 700; }

  /* Sections */
  section { margin: 0 0 46px; }
  section > p, .section-intro { max-width: var(--measure); color: var(--muted); }
  h2 {
    display: flex; align-items: baseline; gap: 12px;
    font-size: 1.5rem; font-weight: 800; letter-spacing: -.01em; margin: 0 0 14px;
  }
  .sec-n {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .82rem; color: var(--orange); font-weight: 700;
    border: 1px solid var(--border); border-radius: 6px; padding: 2px 7px; background: var(--surface);
  }
  h3 { margin: 6px 0 6px; font-size: 1.08rem; font-weight: 700; letter-spacing: -.01em; }

  /* Table */
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow); }
  table { border-collapse: collapse; width: 100%; font-size: .92rem; min-width: 520px; }
  th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  thead th { background: var(--surface-2); font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  tbody tr:last-child td { border-bottom: none; }
  td.mono { font-family: ui-monospace, Menlo, monospace; font-size: .82rem; color: var(--muted); }

  /* Gallery */
  .gallery { display: flex; flex-direction: column; gap: 30px; margin-top: 24px; }
  .shot {
    margin: 0; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
    display: grid; grid-template-columns: 1.35fr 1fr;
  }
  @media (max-width: 760px) { .shot { grid-template-columns: 1fr; } }
  .frame { background: var(--surface-2); padding: 14px; display: flex; flex-direction: column; }
  .chrome {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px 8px 0 0; border-bottom: none; padding: 7px 11px;
  }
  .dots { display: inline-flex; gap: 5px; }
  .dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--border); }
  .dots i:nth-child(1) { background: #ff5f57; }
  .dots i:nth-child(2) { background: #febc2e; }
  .dots i:nth-child(3) { background: #28c840; }
  .omnibox {
    flex: 1; display: flex; align-items: center; gap: 6px;
    background: var(--surface-2); border-radius: 6px; padding: 4px 10px;
    font-family: ui-monospace, Menlo, monospace; font-size: .76rem; color: var(--muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .omnibox svg { color: var(--green); flex-shrink: 0; }
  .frame img {
    display: block; width: 100%; height: auto;
    border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px;
  }
  figcaption { padding: 22px 24px; display: flex; flex-direction: column; justify-content: center; }
  .cap-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .fig-n { font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--orange); }
  .route {
    font-family: ui-monospace, Menlo, monospace; font-size: .74rem; color: var(--muted);
    background: var(--surface-2); border: 1px solid var(--border); border-radius: 5px; padding: 1px 7px;
  }
  figcaption p { margin: 0; color: var(--muted); font-size: .93rem; }

  /* Checklist */
  .checklist { list-style: none; margin: 20px 0 0; padding: 0; display: grid; gap: 10px; }
  .checklist li {
    display: flex; align-items: flex-start; gap: 12px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    padding: 13px 16px; box-shadow: var(--shadow); font-size: .95rem;
  }
  .tick {
    flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
    background: var(--green); color: #fff; display: grid; place-items: center;
    font-size: .78rem; font-weight: 800; margin-top: 1px;
  }

  /* Callout */
  .callout {
    background: var(--surface); border: 1px solid var(--border);
    border-left: 4px solid var(--orange); border-radius: var(--radius);
    padding: 22px 26px; box-shadow: var(--shadow);
  }
  .callout-title { font-size: 1.15rem; margin: 0 0 8px; color: var(--orange); }
  .callout p { margin: 0; max-width: var(--measure); }

  .foot {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
    border-top: 1px solid var(--border); padding-top: 18px; margin-top: 8px;
    font-size: .82rem; color: var(--muted);
  }
  a:focus-visible, li:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
</style>`;

const html = style + `
<article>
  <header class="hero">
    <div class="brand">
      <span class="logo">SenEvent</span>
      <nav class="topnav"><span class="active">Accueil</span><span>Nouvel evenement</span></nav>
    </div>
    <div class="hero-body">
      <p class="eyebrow">DAWM · Bloc Web React 4/4 · M1 RETEL — DMI/FST/UCAD</p>
      <h1>Lab 4 — Formulaires &amp; React Router</h1>
      <p class="lede">Rapport de réalisation : une SPA à trois routes, formulaire à inputs contrôlés avec validation, navigation sans rechargement via React Router v6.</p>
      <div class="chips">
        <span class="chip chip-tag">tag&nbsp;: v0.4-spa</span>
        <span class="chip">Vite + React 18</span>
        <span class="chip">react-router-dom 6</span>
        <span class="chip">Build ✓ 0 erreur</span>
      </div>
    </div>
  </header>

  <section>
    <h2><span class="sec-n">01</span> Architecture des routes</h2>
    <p>Le <code>&lt;BrowserRouter&gt;</code> lit l'URL et choisit une seule vue. L'état des événements vit dans <code>App</code> et descend en props vers les pages, pour être partagé entre la liste, le formulaire et le détail.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Path</th><th>Composant page</th><th>Rôle</th><th>Hooks router</th></tr></thead>
        <tbody>${routesHtml}</tbody>
      </table>
    </div>
  </section>

  <section>
    <h2><span class="sec-n">02</span> Les écrans, en situation</h2>
    <p class="section-intro">Captures prises sur l'application en fonctionnement (Chrome, serveur de dev Vite). Chaque cadre affiche la route courante — l'URL change à chaque navigation, mais la page HTML n'est jamais rechargée.</p>
    <div class="gallery">
      ${figuresHtml}
    </div>
  </section>

  <section>
    <h2><span class="sec-n">03</span> Checklist de validation</h2>
    <ul class="checklist">
      ${checklistHtml}
    </ul>
  </section>

  <section class="callout">
    <h2 class="callout-title">Limite connue — et voulue</h2>
    <p>Les événements ajoutés vivent dans l'état React d'<code>App</code>, donc en mémoire. Un <kbd>F5</kbd> relance le <code>fetch(\"/evenements.json\")</code> au montage : l'événement créé disparaît. C'est intentionnel au Lab 4. Au <strong>Lab 5</strong>, Supabase remplace le mock JSON, l'ajout devient un <code>INSERT</code> en base et survit au rechargement.</p>
  </section>

  <footer class="foot">
    <span>SenEvent · Rapport Lab 4</span>
    <span>Généré le 06/07/2026</span>
  </footer>
</article>`;

writeFileSync(
  "/Users/babacarmbow/Desktop/Projets dev/senevent/rapport-lab4.html",
  html
);
console.log("wrote rapport-lab4.html,", html.length, "chars");
