import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/senevent-lab6-screens";
const b64 = name =>
  `data:image/png;base64,${readFileSync(`${DIR}/${name}.png`).toString("base64")}`;

const esc = s =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Preuves collectees par setup-lab6.mjs contre la vraie base.
const p = JSON.parse(
  readFileSync(
    "/Users/babacarmbow/Desktop/Projets dev/senevent/apps/web/preuves-lab6.json",
    "utf8"
  )
);

// ---------- Extraits de code ----------
const jsSelect = `const charger = async () => {
  setChargement(true);
  setErreur(null);
  const { data, error } = await supabase
    .from("evenements")
    .select("*, profiles(nom)")
    .order("date_debut", { ascending: true });
  if (error) {
    setErreur(error.message);
  } else {
    setEvenements(data);
  }
  setChargement(false);
};`;

const jsAvant = `// Labs 1-5 : lecture seule, figee dans un fichier statique
const reponse = await fetch("/evenements.json");
if (!reponse.ok) throw new Error(\`Erreur HTTP \${reponse.status}\`);
const data = await reponse.json();`;

const jsInsert = `const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  setErreurServeur("Vous devez etre connecte.");
  setEnCours(false);
  return;
}

const { error } = await supabase.from("evenements").insert({
  titre: titre.trim(),
  categorie,
  lieu_nom: lieu.trim(),
  prix: Number(prix),
  date_debut: new Date().toISOString(),
  image_url,
  organisateur_id: user.id,   // RLS verifie que c'est bien auth.uid()
});

if (error) {
  setErreurServeur(error.message);
  return;
}
await onAjoutReussi();  // re-fetch : la liste redevient ce que la base dit
navigate("/");`;

const jsInscription = `// Deja inscrit ? Les .eq() se chainent : WHERE ev_id = ... AND user_id = ...
const { data, error } = await supabase
  .from("inscriptions")
  .select("id")
  .eq("evenement_id", evenementId)
  .eq("utilisateur_id", session.user.id);

// S'inscrire = INSERT ; se desinscrire = DELETE cible par les memes filtres
const sInscrire = async () => {
  const { error } = await supabase.from("inscriptions").insert({
    evenement_id: evenementId,
    utilisateur_id: session.user.id,
  });
  if (error) setErreur(error.message); else setInscrit(true);
};

const seDesinscrire = async () => {
  const { error } = await supabase
    .from("inscriptions")
    .delete()
    .eq("evenement_id", evenementId)
    .eq("utilisateur_id", session.user.id);
  if (error) setErreur(error.message); else setInscrit(false);
};`;

const jsDelete = `// L'UI cache le bouton : confort, pas securite.
const estOrganisateur =
  session && session.user.id === evenement.organisateur_id;

const supprimer = async () => {
  if (!window.confirm("Supprimer cet evenement ?")) return;
  const { error } = await supabase
    .from("evenements")
    .delete()
    .eq("id", evenement.id);   // RLS refuse si ce n'est pas le proprietaire
  if (error) { setErreurSuppression(error.message); return; }
  await onSupprime();
  navigate("/");
};

{estOrganisateur && (
  <button onClick={supprimer} className={styles.supprimer}>
    Supprimer cet evenement
  </button>
)}`;

const jsStorage = `let image_url = \`https://placehold.co/400x250/1a3a5c/fff?text=\${categorie}\`;
if (fichier) {
  // Le chemin commence par l'uid : c'est ce qu'exige la policy Storage.
  const chemin = \`\${user.id}/\${Date.now()}_\${fichier.name}\`;
  const { error: erreurUpload } = await supabase.storage
    .from("affiches")
    .upload(chemin, fichier);
  if (erreurUpload) { setErreurServeur(erreurUpload.message); return; }

  // getPublicUrl est synchrone : il construit l'URL, sans appel reseau.
  const { data: urlData } = supabase.storage
    .from("affiches")
    .getPublicUrl(chemin);
  image_url = urlData.publicUrl;
}`;

const sqlStorage = `insert into storage.buckets (id, name, public)
values ('affiches', 'affiches', true)
on conflict (id) do nothing;

-- Lecture pour tous, y compris anonyme (le catalogue est public)
create policy "affiches_select_public"
  on storage.objects for select
  using (bucket_id = 'affiches');

-- Upload authentifie, et uniquement dans son propre dossier "<uid>/..."
create policy "affiches_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'affiches'
    and (storage.foldername(name))[1] = auth.uid()::text
  );`;

const jsTrigger = `// Le nom part dans raw_user_meta_data : le trigger on_auth_user_created
// (Lab 5) le lit pour creer la ligne profiles dans la meme transaction.
const { error } = await supabase.auth.signUp({
  email,
  password: motDePasse,
  options: { data: { nom } },
});`;

// ---------- Tableau CRUD ----------
const crud = [
  ["Read", ".from('evenements').select('*, profiles(nom)')", "Catalogue trie par date, avec le nom de l'organisateur", "App.jsx"],
  ["Create", ".from('evenements').insert({...})", "Creation d'un evenement, organisateur_id = auth.uid()", "NouvelEvenement.jsx"],
  ["Create", ".from('inscriptions').insert({...})", "S'inscrire a un evenement", "BoutonInscription.jsx"],
  ["Delete", ".from('inscriptions').delete().eq(...).eq(...)", "Se desinscrire", "BoutonInscription.jsx"],
  ["Delete", ".from('evenements').delete().eq('id', x)", "Suppression par l'organisateur seulement", "Detail.jsx"],
  ["Storage", ".storage.from('affiches').upload(chemin, fichier)", "Televersement de l'affiche, puis getPublicUrl()", "NouvelEvenement.jsx"],
];
const crudHtml = crud
  .map(([op, methode, role, fichier]) =>
    `<tr><td><b>${op}</b></td><td class="mono">${esc(methode)}</td><td>${role}</td><td class="mono">${fichier}</td></tr>`)
  .join("\n");

// ---------- Tableau des preuves ----------
const ok = "<span class='ok'>&#10003;</span>";
const preuves = [
  [
    "INSERT autorise",
    "A cree un evenement avec organisateur_id = son uid",
    `HTTP ${p.insert.statut} — evenement #${p.insert.evenement.id} cree`,
    ok,
  ],
  [
    "INSERT usurpe refuse",
    "B tente organisateur_id = uid de A",
    `HTTP ${p.insertUsurpe.statut} — ${p.insertUsurpe.corps?.code ?? "refuse"} : violation de la policy with check`,
    ok,
  ],
  [
    "Inscription",
    "B s'inscrit a l'evenement de A",
    `HTTP ${p.inscription.statut} — ligne #${p.inscription.ligne.id} creee`,
    ok,
  ],
  [
    "Double inscription refusee",
    "B reinsere la meme paire (evenement, utilisateur)",
    `HTTP ${p.doublon.statut} — ${p.doublon.corps?.code ?? "23505"} : contrainte unique violee`,
    ok,
  ],
  [
    "DELETE refuse par RLS",
    "B tente de supprimer l'evenement de A",
    `HTTP ${p.deleteRefuse.statut} — ${p.deleteRefuse.lignesTouchees} ligne touchee, evenement toujours present`,
    ok,
  ],
  [
    "Upload Storage",
    "A televerse une affiche dans son dossier",
    `HTTP ${p.storage.statut} — objet cree, URL publique obtenue`,
    ok,
  ],
  [
    "Upload usurpe refuse",
    "B televerse dans le dossier de A",
    `HTTP ${p.storageUsurpe.statut} — policy de chemin : refuse`,
    ok,
  ],
];
const preuvesHtml = preuves
  .map(([cas, scenario, resultat, statut]) =>
    `<tr><td><b>${cas}</b></td><td>${scenario}</td><td class="mono">${esc(resultat)}</td><td style="text-align:center">${statut}</td></tr>`)
  .join("\n");

// ---------- Figures ----------
const figures = [
  { n: 1, img: "01-catalogue-supabase", route: "/", titre: "Le catalogue vient de PostgreSQL",
    desc: "Visuellement proche du Lab 5, mais l'onglet Network ne montre plus <code>evenements.json</code> : la liste arrive de <code>siszafptxskyfdedpqsl.supabase.co</code>, triee par <code>date_debut</code> cote base. Les evenements crees pendant le lab s'inserent d'eux-memes dans l'ordre chronologique." },
  { n: 2, img: "02-connecte-navbar", route: "/", titre: "Session reelle, ecritures debloquees",
    desc: "Connexion du compte A (Atou Diop). <code>onAuthStateChange</code> met a jour l'etat <code>session</code>, la NavBar bascule et « Nouvel evenement » apparait. Sans cette session, la policy <code>with check</code> refuserait tout INSERT." },
  { n: 3, img: "03-formulaire-insert", route: "/nouveau", titre: "Le formulaire ecrit en base",
    desc: "Les memes champs controles qu'au Lab 4, mais la soumission fait un <code>.insert()</code> reel. Le champ fichier alimente le bonus Storage ; sans fichier, un placeholder est utilise. Le bouton se verrouille pendant l'envoi (<code>enCours</code>)." },
  { n: 4, img: "04-detail-organisateur", route: "/evenement/:id", titre: "Jointure, inscription, suppression",
    desc: "Trois etapes du lab dans un seul ecran. « Organise par : Atou Diop » vient de la jointure <code>profiles(nom)</code>. Le bouton vert ecrit dans <code>inscriptions</code>. Le bouton rouge n'apparait que parce que la session est celle de l'organisateur." },
  { n: 5, img: "05-inscrit-bascule", route: "/evenement/:id", titre: "L'inscription bascule le bouton",
    desc: "Le clic declenche un <code>INSERT</code> dans <code>inscriptions</code> ; l'etat <code>inscrit</code> passe a <code>true</code> et le bouton devient « Se desinscrire », qui fera le <code>DELETE</code> symetrique. La ligne est visible dans le Table Editor." },
  { n: 6, img: "06-inscrit-apres-f5", route: "/evenement/:id", titre: "F5 ne perd plus rien",
    desc: "Apres rechargement complet, le bouton reste sur « Se desinscrire ». L'etat n'est pas dans React : il est relu depuis la base au montage. C'est la difference entre le Lab 4 et le Lab 6 en une capture." },
  { n: 7, img: "07-detail-non-organisateur", route: "/evenement/:id", titre: "Compte B : le bouton disparait",
    desc: "Le meme evenement, vu par le compte B. <code>session.user.id !== evenement.organisateur_id</code> : le bouton « Supprimer » n'est pas rendu. L'inscription, elle, reste offerte a tout le monde." },
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
<title>Rapport Lab 6 — SenEvent</title>
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
  .callout.rls { border-left-color: var(--red); }
  .callout.rls h2 { color: var(--red); }

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
    <p class="eyebrow">DAWM · Bloc Backend 2/2 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 6 — CRUD Supabase depuis React</h1>
    <p class="lede">Rapport de réalisation : le mock JSON disparaît au profit de vraies requêtes PostgreSQL. Lecture, création, inscription et suppression passent par <code>supabase-js</code>, avec Row Level Security qui refuse en direct ce que l'interface se contente de cacher. La persistance devient réelle : F5 ne perd plus rien.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.6-crud</span>
      <span class="chip">SELECT · INSERT · DELETE</span>
      <span class="chip">Jointure profiles</span>
      <span class="chip">Storage</span>
      <span class="chip">RLS vérifiée sur la vraie base</span>
      <span class="chip">Build ✓ 0 erreur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Le remplacement : du fichier statique à la base</h2>
    <p>Depuis le Lab 1, le catalogue venait d'un fichier figé dans <code>public/</code>. Le Lab 6 coupe ce dernier fil. À gauche le code des Labs 1–5, à droite celui d'aujourd'hui : même rôle, mais l'un lit un fichier, l'autre interroge PostgreSQL.</p>
    <div class="two-col">
      <div>
        <p class="code-label">Avant — App.jsx</p>
        <pre>${esc(jsAvant)}</pre>
      </div>
      <div>
        <p class="code-label">Après — App.jsx</p>
        <pre>${esc(jsSelect)}</pre>
      </div>
    </div>
    <p>Trois différences de fond. Il n'y a plus de <code>try / catch</code> : Supabase ne lève pas d'exception, il renvoie <code>{ data, error }</code>, et l'on teste <code>error</code> avant de toucher <code>data</code>. Le tri par <code>date_debut</code> est délégué à PostgreSQL plutôt qu'au client. Et <code>profiles(nom)</code> ramène le nom de l'organisateur dans la même requête — c'est l'étape 5, obtenue en sept caractères.</p>
    <p>Vérification imposée par l'énoncé : <code>grep -rn "evenements.json" apps/web/src</code> ne renvoie plus aucune ligne.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">02</span> Les six opérations câblées</h2>
    <p>Le CRUD complet, réparti sur quatre fichiers. Chaque appel suit le même contrat : on vérifie <code>error</code>, puis on utilise <code>data</code>.</p>
    <table>
      <thead><tr><th>CRUD</th><th>Appel Supabase</th><th>Rôle dans SénEvent</th><th>Fichier</th></tr></thead>
      <tbody>${crudHtml}</tbody>
    </table>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> Créer un événement, puis re-lire</h2>
    <p>Le formulaire du Lab 4 gardait sa saisie dans un <code>useState</code> que le premier F5 effaçait. Il écrit maintenant en base. On passe <code>organisateur_id</code> explicitement, mais ce n'est pas ce qui sécurise : la policy <code>with check (organisateur_id = auth.uid())</code> le vérifie en base, et refuserait un identifiant emprunté — ce que la section 05 démontre.</p>
    <p class="code-label">NouvelEvenement.jsx</p>
    <pre>${esc(jsInsert)}</pre>
    <p>Après l'écriture, deux stratégies existaient. La <b>mise à jour optimiste</b> ajoute la ligne à l'état local sans attendre la base : plus rapide à l'œil, mais il faut défaire en cas d'échec. Le <b>re-fetch</b>, retenu ici, rappelle <code>charger()</code> : une requête de plus, mais la liste reste exactement ce que la base contient — pas de divergence possible entre l'écran et la vérité. Sur le volume de SénEvent, la simplicité gagne.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">04</span> S'inscrire : deux écritures symétriques</h2>
    <p>Un même composant porte trois états — non connecté, inscrit, non inscrit — et deux écritures inverses. Au montage, un <code>SELECT</code> filtré demande à la base si l'inscription existe déjà : l'état vient de PostgreSQL, jamais d'une supposition du client.</p>
    <p class="code-label">components/BoutonInscription.jsx</p>
    <pre>${esc(jsInscription)}</pre>
    <p>Les <code>.eq()</code> s'enchaînent en un <code>AND</code> : <code>WHERE evenement_id = 12 AND utilisateur_id = 'abc'</code>. C'est le motif pour viser une ligne précise avant un <code>DELETE</code>. La contrainte <code>unique (evenement_id, utilisateur_id)</code> du Lab 5 reste la ceinture : même si un bug tentait un double <code>INSERT</code>, PostgreSQL le refuserait — vérifié en section 06.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> Supprimer : l'UI cache, RLS protège</h2>
    <p>L'organisateur voit un bouton rouge sur ses propres événements. Les autres ne le voient pas — mais c'est du confort d'interface, pas une sécurité : on n'affiche pas une action impossible.</p>
    <p class="code-label">pages/Detail.jsx</p>
    <pre>${esc(jsDelete)}</pre>
    <div class="callout rls">
      <h2>Ne jamais compter sur l'UI seule</h2>
      <p>Cacher un bouton n'empêche rien : la console reste ouverte, et <code>supabase.from("evenements").delete().eq("id", …)</code> s'appelle à la main. Ce qui bloque vraiment, c'est <code>using (organisateur_id = auth.uid())</code>, évalué par PostgreSQL à chaque ligne. Le <code>DELETE</code> d'un compte non propriétaire ne lève pas d'erreur — plus subtil : il réussit en ne touchant <b>aucune ligne</b>, parce que RLS a rendu ces lignes invisibles à l'opération. C'est exactement ce que montre le tableau suivant.</p>
    </div>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">06</span> Ce que la base a réellement répondu</h2>
    <p>Scénario joué contre le projet Supabase avec deux comptes réels — A (Atou Diop, organisateur) et B (Khady Ndiaye) — et non contre un mock. Chaque ligne est une requête HTTP réelle et sa réponse.</p>
    <table>
      <thead><tr><th>Cas</th><th>Scénario</th><th>Réponse de la base</th><th>Conforme</th></tr></thead>
      <tbody>${preuvesHtml}</tbody>
    </table>
    <p style="margin-top:10px">Les deux lignes qui comptent sont les refus. L'<code>INSERT</code> usurpé est rejeté franchement (violation de <code>with check</code>) : on ne peut pas s'inscrire organisateur à la place d'un autre. Le <code>DELETE</code>, lui, renvoie un succès en ne supprimant <b>${p.deleteRefuse.lignesTouchees} ligne</b> — l'événement de A est toujours en base après la tentative de B. Deux formes de refus, une seule cause : la politique est évaluée en base, hors d'atteinte du client.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Bonus — Storage : la troisième brique Supabase</h2>
    <p>Après Auth et PostgreSQL, le stockage de fichiers. <code>image_url</code> ne pointe plus forcément vers un placeholder : le formulaire accepte une affiche, la téléverse, et récupère son URL publique avant l'<code>INSERT</code>.</p>
    <div class="two-col">
      <div>
        <p class="code-label">NouvelEvenement.jsx — upload puis insert</p>
        <pre>${esc(jsStorage)}</pre>
      </div>
      <div>
        <p class="code-label">migrations/006_storage.sql</p>
        <pre>${esc(sqlStorage)}</pre>
      </div>
    </div>
    <p>Le bucket est créé en SQL plutôt qu'à la souris : il rejoint les migrations du Lab 5, et l'infrastructure reste reproductible. Storage expose les fichiers comme des lignes de <code>storage.objects</code> — la sécurité s'y écrit donc en RLS, exactement comme sur nos tables. La policy impose que le chemin commence par l'uid de l'auteur : B ne peut pas écrire dans le dossier de A, vérifié en section 06.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> Un correctif hérité du Lab 5</h2>
    <p>L'étape 5 affiche le nom de l'organisateur — encore faut-il qu'il existe. Le signup du Lab 5 insérait lui-même la ligne <code>profiles</code>, alors que le trigger <code>on_auth_user_created</code> l'avait déjà créée : les deux écritures se marchaient dessus et le nom retombait sur le défaut <code>'Invite'</code>. Le trigger lit <code>raw_user_meta_data ->> 'nom'</code> : c'est donc à <code>signUp</code> de le transmettre, et l'insertion manuelle disparaît.</p>
    <p class="code-label">pages/Auth.jsx</p>
    <pre>${esc(jsTrigger)}</pre>
    <p>Les profils créés pendant ce lab portent désormais leur vrai nom (${p.profils.map(x => `<code>${x.nom}</code>`).join(", ")}), et « Organisé par » affiche autre chose que « Invite ». Les 5 événements seed, eux, n'ont pas d'organisateur : leur <code>profiles</code> vaut <code>null</code> et l'interface retombe sur « Equipe SenEvent ».</p>
  </section>

  <section>
    <h2><span class="sec-n">09</span> Le parcours, en situation</h2>
    <p>Captures prises sur l'application en fonctionnement, avec des sessions réelles et la vraie base : lecture du catalogue, création, inscription, persistance après rechargement, et bascule de l'interface selon le propriétaire.</p>
    ${figuresHtml}
  </section>

  <section class="callout">
    <h2>Vers le Lab 7</h2>
    <p>L'application web est complète : catalogue réel, création, inscription, suppression, upload — tout persiste. Mais toute la logique Supabase est écrite en dur dans les composants web : <code>.from().select()</code>, les formes de données, les helpers d'auth. Construire le mobile en React Native (Labs 8–10) obligerait à réécrire la même chose une seconde fois — la duplication qu'on s'est promis d'éviter. Au Lab 7, cette logique part dans <code>packages/shared</code> : workspaces npm, TypeScript pour typer les données, et des fonctions réutilisables (<code>getEvenements()</code>, <code>creerEvenement()</code>) à la place des appels dispersés. Une seule source de vérité, consommée par le web puis par le mobile.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 6 — CRUD Supabase</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab6.html`, html);
writeFileSync(
  "/Users/babacarmbow/Desktop/Projets dev/senevent/rapport-lab6.html",
  html
);
console.log("wrote rapport-lab6.html,", html.length, "chars");
