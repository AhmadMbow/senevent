import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/senevent-screens";
const b64 = name =>
  `data:image/png;base64,${readFileSync(`${DIR}/${name}.png`).toString("base64")}`;

const figures = [
  { n: 1, img: "01-accueil", route: "/", titre: "Accueil — la liste des événements",
    desc: "La route <code>/</code> rend le composant <code>Accueil</code> : NavBar, barre de recherche et les 5 événements du mock <code>evenements.json</code> en grille de cartes. L'onglet « Accueil » est actif (soulignement orange géré par <code>NavLink</code>)." },
  { n: 2, img: "02-recherche", route: "/", titre: "Filtrage en temps réel",
    desc: "En tapant « conf » dans la <code>SearchBar</code>, la liste se réduit instantanément à « Conference IA &amp; Developpement ». Le filtre repose sur un état contrôlé ; l'URL ne change pas." },
  { n: 3, img: "03-formulaire-vide", route: "/nouveau", titre: "Formulaire de création",
    desc: "La route <code>/nouveau</code> affiche <code>NouvelEvenement</code> : quatre champs contrôlés (titre, catégorie, lieu, prix). Chaque frappe met à jour un <code>useState</code>." },
  { n: 4, img: "04-validation-erreurs", route: "/nouveau", titre: "Validation côté client",
    desc: "Soumission à vide : la validation bloque l'envoi et affiche les messages d'erreur en rouge (« titre ≥ 3 caractères », « lieu requis »). <code>event.preventDefault()</code> empêche le rechargement HTML par défaut." },
  { n: 5, img: "05-formulaire-rempli", route: "/nouveau", titre: "Formulaire valide, prêt à soumettre",
    desc: "Titre, lieu et prix (3000 FCFA) renseignés. Aucune erreur : la soumission va créer l'événement puis rediriger vers l'accueil." },
  { n: 6, img: "06-accueil-apres-ajout", route: "/", titre: "Redirection après ajout",
    desc: "Après <code>onAjouter</code>, <code>navigate(\"/\")</code> ramène à l'accueil. Le nouvel événement « Concert de fin d'annee » apparaît en tête de liste (ajout immuable en début de tableau)." },
  { n: 7, img: "07-detail", route: "/evenement/:id", titre: "Page de détail (route paramétrée)",
    desc: "Un clic sur une carte navigue vers <code>/evenement/1</code>. <code>useParams</code> lit l'<code>:id</code>, l'événement est retrouvé dans la liste et affiché en grand. Le bouton « Retour » appelle <code>navigate(-1)</code>." },
  { n: 8, img: "08-404", route: "*", titre: "Route 404 (bonus)",
    desc: "Toute URL non prévue tombe sur la route catch-all <code>path=\"*\"</code> → composant <code>NonTrouvee</code>. La NavBar reste visible car elle est déclarée au-dessus de <code>&lt;Routes&gt;</code>." },
];

const routes = [
  ["/", "Accueil", "Liste + SearchBar", "useState, useEffect"],
  ["/nouveau", "NouvelEvenement", "Formulaire + validation", "useState, useNavigate"],
  ["/evenement/:id", "Detail", "Fiche d'un événement", "useParams, useNavigate"],
  ["*", "NonTrouvee", "Page 404 (bonus)", "—"],
];

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

const routesHtml = routes
  .map(([p, c, r, h]) => `<tr><td><code>${p}</code></td><td>${c}</td><td>${r}</td><td class="mono">${h}</td></tr>`)
  .join("\n");

const checklistHtml = checklist
  .map(c => `<li><span class="tick">✓</span><span>${c}</span></li>`).join("\n");

const figuresHtml = figures.map(f => `
  <figure class="shot">
    <div class="shot-head">
      <span class="fig-n">Figure ${f.n}</span>
      <span class="route">${f.route}</span>
      <h3>${f.titre}</h3>
    </div>
    <img src="${b64(f.img)}" alt="${f.titre}" />
    <figcaption>${f.desc}</figcaption>
  </figure>`).join("\n");

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Lab 4 — SenEvent</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  :root {
    --navy: #1a3a5c; --navy-deep: #14304d; --orange: #ea7d2b;
    --red: #a01a1a; --green: #1f7a4d;
    --ink: #1b2430; --muted: #566070; --border: #d9dfe8; --soft: #eef1f6;
  }
  html { font-size: 10.5pt; }
  body {
    margin: 0; color: var(--ink); background: #fff;
    font-family: "Helvetica Neue", Arial, system-ui, sans-serif; line-height: 1.55;
  }
  code, .mono { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: .82em; }
  code { background: var(--soft); color: var(--navy); padding: .08em .35em; border-radius: 4px; }

  /* Cover header */
  .cover {
    background: linear-gradient(160deg, var(--navy), var(--navy-deep));
    color: #fff; border-radius: 10px; padding: 26px 28px; margin-bottom: 24px;
  }
  .cover .top { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,.18); padding-bottom: 12px; margin-bottom: 18px; }
  .logo { font-weight: 800; font-size: 15pt; color: var(--orange); }
  .top .nav { font-size: 9pt; color: rgba(255,255,255,.7); }
  .top .nav b { color: #fff; border-bottom: 2px solid var(--orange); padding-bottom: 2px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 7.5pt;
    font-weight: 700; color: var(--orange); margin: 0 0 8px; }
  .cover h1 { margin: 0 0 8px; font-size: 23pt; line-height: 1.1; font-weight: 800; letter-spacing: -.01em; }
  .cover .lede { margin: 0 0 16px; max-width: 62ch; color: rgba(255,255,255,.85); font-size: 11pt; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 8pt; font-weight: 600; padding: 4px 9px; border-radius: 999px;
    background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); }
  .chip.tag { background: var(--orange); color: #1c1206; border-color: var(--orange); font-weight: 700; }

  section { margin-bottom: 22px; }
  h2 { font-size: 14pt; font-weight: 800; letter-spacing: -.01em; margin: 0 0 8px;
    display: flex; align-items: baseline; gap: 9px; }
  .sec-n { font-family: Menlo, monospace; font-size: 8.5pt; color: var(--orange);
    border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; }
  section > p { margin: 0 0 10px; color: var(--muted); max-width: 68ch; }

  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  thead th { background: var(--soft); font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  tbody tr:last-child td { border-bottom: none; }
  td.mono { color: var(--muted); }

  /* Screens */
  .shot { break-inside: avoid; page-break-inside: avoid; margin: 0 0 18px;
    border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: #fff; }
  .shot-head { padding: 10px 14px 8px; background: var(--soft); border-bottom: 1px solid var(--border); }
  .shot-head .fig-n { font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--orange); }
  .shot-head .route { font-family: Menlo, monospace; font-size: 8pt; color: var(--muted);
    background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; margin-left: 8px; }
  .shot-head h3 { margin: 5px 0 0; font-size: 11pt; font-weight: 700; }
  .shot img { display: block; width: 100%; height: auto; border-bottom: 1px solid var(--border); }
  figcaption { padding: 10px 14px; font-size: 9.5pt; color: var(--muted); }

  .checklist { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
  .checklist li { display: flex; gap: 9px; align-items: flex-start; font-size: 9.8pt;
    border: 1px solid var(--border); border-radius: 8px; padding: 8px 11px; break-inside: avoid; }
  .tick { flex: 0 0 auto; width: 17px; height: 17px; border-radius: 50%; background: var(--green);
    color: #fff; font-size: 8pt; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 1px; }

  .callout { border: 1px solid var(--border); border-left: 4px solid var(--orange);
    border-radius: 8px; padding: 12px 16px; break-inside: avoid; }
  .callout h2 { font-size: 11.5pt; color: var(--orange); margin-bottom: 5px; }
  .callout p { margin: 0; color: var(--ink); font-size: 9.8pt; }

  .foot { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 10px;
    display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">SenEvent</span>
      <span class="nav"><b>Accueil</b>&nbsp;&nbsp;&nbsp;Nouvel evenement</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Web React 4/4 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 4 — Formulaires &amp; React Router</h1>
    <p class="lede">Rapport de réalisation : une SPA à trois routes, formulaire à inputs contrôlés avec validation, et navigation sans rechargement via React Router v6.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.4-spa</span>
      <span class="chip">Vite + React 18</span>
      <span class="chip">react-router-dom 6</span>
      <span class="chip">Build ✓ 0 erreur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Architecture des routes</h2>
    <p>Le <code>&lt;BrowserRouter&gt;</code> lit l'URL et choisit une seule vue. L'état des événements vit dans <code>App</code> et descend en props vers les pages, afin d'être partagé entre la liste, le formulaire et le détail.</p>
    <table>
      <thead><tr><th>Path</th><th>Composant page</th><th>Rôle</th><th>Hooks router</th></tr></thead>
      <tbody>${routesHtml}</tbody>
    </table>
  </section>

  <section>
    <h2><span class="sec-n">02</span> Les écrans, en situation</h2>
    <p>Captures prises sur l'application réellement en fonctionnement (Chrome + serveur de dev Vite), en jouant le parcours utilisateur complet.</p>
    ${figuresHtml}
  </section>

  <section class="callout">
    <h2>Limite connue — et voulue</h2>
    <p>Les événements ajoutés vivent dans l'état React d'<code>App</code>, donc en mémoire. Un F5 relance le <code>fetch("/evenements.json")</code> au montage : l'événement créé disparaît. C'est intentionnel au Lab 4. Au Lab 5, Supabase remplace le mock JSON, l'ajout devient un <code>INSERT</code> en base et survit au rechargement.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 4</span><span>06/07/2026</span></div>
</body>
</html>`;

writeFileSync("/tmp/senevent-screens/rapport-print.html", html);
console.log("wrote print html,", html.length, "chars");
