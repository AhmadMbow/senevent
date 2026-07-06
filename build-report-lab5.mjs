import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/senevent-lab5-screens";
const b64 = name =>
  `data:image/png;base64,${readFileSync(`${DIR}/${name}.png`).toString("base64")}`;

const esc = s =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- Extraits de code ----------
const sqlSchema = `create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null,
  telephone text,
  role text not null default 'PUBLIC'
    check (role in ('PUBLIC', 'ORGANISATEUR', 'ADMIN')),
  created_at timestamptz not null default now()
);

create table public.evenements (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) >= 3),
  categorie text not null check (categorie in
    ('concert','expo','conference','atelier','soutenance')),
  lieu_nom text not null,
  date_debut timestamptz not null,
  prix integer not null default 0 check (prix >= 0),
  image_url text,
  organisateur_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inscriptions (
  id bigint generated always as identity primary key,
  evenement_id bigint not null references public.evenements (id) on delete cascade,
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (evenement_id, utilisateur_id)
);`;

const sqlRls = `alter table public.evenements enable row level security;

-- Lecture publique (meme anonyme)
create policy "evenements_select_public"
  on public.evenements for select using (true);

-- Insertion pour un utilisateur authentifie, qui devient organisateur
create policy "evenements_insert_auth"
  on public.evenements for insert to authenticated
  with check (organisateur_id = auth.uid());

-- Modification / suppression par le proprietaire seulement
create policy "evenements_update_owner"
  on public.evenements for update to authenticated
  using (organisateur_id = auth.uid());`;

const jsClient = `import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Variables Supabase manquantes. Verifiez .env.local");
}

export const supabase = createClient(url, anonKey);`;

const jsSession = `useEffect(() => {
  // Session actuelle au montage (lue depuis le localStorage)
  supabase.auth.getSession().then(({ data }) => setSession(data.session));

  // Ecouter login / logout / refresh de token
  const { data: subscription } = supabase.auth.onAuthStateChange(
    (_event, newSession) => setSession(newSession)
  );

  return () => subscription.subscription.unsubscribe();
}, []);`;

// ---------- Tables ----------
const tables = [
  ["profiles", "uuid (= auth.users)", "nom, telephone, role", "lecture publique, update self"],
  ["evenements", "bigint identity", "titre, categorie, lieu, prix, organisateur_id", "lecture publique, insert/update/delete owner"],
  ["inscriptions", "bigint identity", "evenement_id, utilisateur_id", "lecture publique, insert/delete self"],
];
const tablesHtml = tables
  .map(([t, pk, cols, rls]) =>
    `<tr><td><code>${t}</code></td><td class="mono">${pk}</td><td>${cols}</td><td>${rls}</td></tr>`)
  .join("\n");

// ---------- Figures ----------
const figures = [
  { n: 1, img: "01-navbar-deconnecte", route: "/", titre: "Etat non connecte",
    desc: "Au chargement, <code>getSession()</code> ne trouve aucune session : la NavBar n'affiche que « Accueil » et « Se connecter ». Le lien « Nouvel evenement », reserve aux connectes, reste masque." },
  { n: 2, img: "02-auth-login", route: "/auth", titre: "Ecran de connexion",
    desc: "La route <code>/auth</code> rend le composant <code>Auth</code> en mode <code>login</code> : email + mot de passe. La soumission appelle <code>supabase.auth.signInWithPassword</code>." },
  { n: 3, img: "03-auth-signup", route: "/auth", titre: "Bascule vers l'inscription",
    desc: "Un clic sur « Pas encore de compte ? Creer » bascule l'etat <code>mode</code> vers <code>signup</code> : le champ « Nom d'affichage » apparait. Un seul composant gere les deux parcours." },
  { n: 4, img: "04-auth-signup-rempli", route: "/auth", titre: "Formulaire d'inscription rempli",
    desc: "Nom, email et mot de passe (6 caracteres minimum, controle par <code>minLength</code>) saisis. La soumission enchaine <code>signUp</code> puis l'insertion de la ligne <code>profiles</code>." },
  { n: 5, img: "05-navbar-connecte", route: "/", titre: "Session active, NavBar contextuelle",
    desc: "Apres le signup, <code>onAuthStateChange</code> met a jour l'etat <code>session</code> : la NavBar affiche l'email, le bouton « Se deconnecter » et debloque « Nouvel evenement ». Aucun rechargement." },
  { n: 6, img: "06-auth-erreur", route: "/auth", titre: "Gestion des erreurs",
    desc: "Une tentative de connexion avec des identifiants invalides remonte l'erreur Supabase, affichee en rouge sous le champ. Le <code>try / catch</code> du composant capture le message et le rend a l'utilisateur." },
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
<title>Rapport Lab 5 — SenEvent</title>
<style>
  @page { size: A4; margin: 15mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  :root {
    --navy: #1a3a5c; --navy-deep: #14304d; --orange: #ea7d2b;
    --red: #a01a1a; --green: #1f7a4d;
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
  td.mono { color: var(--muted); font-size: 8.3pt; }

  pre { background: var(--code-bg); color: #dbe6f3; border-radius: 8px;
    padding: 12px 14px; font-size: 8.2pt; line-height: 1.5; overflow-x: auto;
    margin: 0 0 6px; break-inside: avoid; page-break-inside: avoid; }
  pre .cmt { color: #7fa7c9; }
  pre .kw { color: #f0a35e; }
  .code-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .07em;
    color: var(--muted); margin: 0 0 4px; font-weight: 700; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

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
      <span class="nav"><b>Accueil</b>&nbsp;&nbsp;&nbsp;Nouvel evenement&nbsp;&nbsp;&nbsp;Se connecter</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Backend 1/2 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 5 — Supabase : projet, schéma SQL &amp; auth</h1>
    <p class="lede">Rapport de réalisation : une base PostgreSQL managée, un schéma à trois tables sécurisé par Row Level Security, le SDK <code>@supabase/supabase-js</code> câblé dans React, et un cycle complet d'authentification signup / login / logout.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.5-supabase</span>
      <span class="chip">PostgreSQL</span>
      <span class="chip">Row Level Security</span>
      <span class="chip">@supabase/supabase-js</span>
      <span class="chip">Build ✓ 0 erreur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Le schéma SQL</h2>
    <p>Trois tables applicatives sous le schéma <code>public</code>, greffées sur la table <code>auth.users</code> fournie par Supabase. Clés primaires, clés étrangères, contraintes <code>check</code> et valeurs par défaut sont déclarées en base — la structure ne peut pas être contournée depuis le client.</p>
    <table>
      <thead><tr><th>Table</th><th>Clé primaire</th><th>Colonnes clés</th><th>RLS</th></tr></thead>
      <tbody>${tablesHtml}</tbody>
    </table>
    <div style="height:10px"></div>
    <p class="code-label">supabase/migrations/001_schema.sql</p>
    <pre>${esc(sqlSchema)}</pre>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> Row Level Security</h2>
    <p>Dès qu'on active RLS, l'accès est refusé par défaut (<em>deny-by-default</em>) tant qu'aucune politique n'autorise l'action. On écrit alors une politique par cas d'usage. Distinction clé : <code>using(...)</code> filtre les lignes existantes visibles/modifiables ; <code>with check(...)</code> contraint les valeurs d'une ligne insérée ou modifiée.</p>
    <p class="code-label">supabase/migrations/002_rls.sql — exemple table evenements</p>
    <pre>${esc(sqlRls)}</pre>
    <p>Les tables <code>profiles</code> et <code>inscriptions</code> suivent le même modèle : lecture publique, écriture restreinte au propriétaire via <code>id = auth.uid()</code> ou <code>utilisateur_id = auth.uid()</code>. La contrainte <code>unique(evenement_id, utilisateur_id)</code> interdit la double inscription au niveau de la base.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> Le client Supabase dans React</h2>
    <p>Le SDK est instancié une seule fois depuis les variables d'environnement de Vite (préfixe <code>VITE_</code>), exposées via <code>import.meta.env</code>. Le fichier <code>.env.local</code> reste hors de Git (<code>.gitignore</code>) : la clé n'apparaît jamais dans l'historique.</p>
    <p class="code-label">src/lib/supabase.js</p>
    <pre>${esc(jsClient)}</pre>
    <div style="height:8px"></div>
    <p class="code-label">App.jsx — écoute de session</p>
    <pre>${esc(jsSession)}</pre>
    <p><code>getSession()</code> lit la session en cache au montage ; <code>onAuthStateChange</code> maintient l'état <code>session</code> synchronisé à chaque login, logout ou rafraîchissement de token. La fonction de nettoyage désabonne l'écouteur au démontage.</p>
  </section>

  <section>
    <h2><span class="sec-n">04</span> L'authentification, en situation</h2>
    <p>Captures prises sur l'application en fonctionnement, en jouant le parcours complet : état non connecté, connexion, inscription, session active avec NavBar contextuelle, et gestion d'une erreur d'identifiants.</p>
    ${figuresHtml}
  </section>

  <section class="callout">
    <h2>Vers le Lab 6</h2>
    <p>L'authentification passe désormais par Supabase — login, session, déconnexion. Le catalogue, lui, vient encore du mock <code>evenements.json</code>. Au Lab 6, <code>fetch("/evenements.json")</code> devient <code>supabase.from('evenements').select()</code>, le formulaire fait un vrai <code>INSERT</code>, l'inscription à un événement écrit dans <code>inscriptions</code>, et les images passent par Supabase Storage. La persistance devient réelle : F5 ne perd plus rien.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 5 — Supabase</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab5.html`, html);
writeFileSync(
  "/Users/babacarmbow/Desktop/Projets dev/senevent/rapport-lab5.html",
  html
);
console.log("wrote rapport-lab5.html,", html.length, "chars");
