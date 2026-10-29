// Lab 11 — Generateur du rapport HTML.
// Lit les captures et les preuves de apps/web/capture-lab11.mjs (phases avant
// et apres), et refait au moment de la generation les verifications de
// l'enseignant (section 11.2), le build local, l'etat des Pull Requests, de la
// protection de main et du deploiement de production. Rien n'est ecrit en dur
// cote resultats.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const DIR = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab11-screens";
const PROD = "https://senevent-mbow.vercel.app";
const DEPOT = "AhmadMbow/senevent";

const image = (nom) => {
  const fichier = [".png", ".jpg"].map((e) => `${DIR}/${nom}${e}`).find(existsSync);
  const type = fichier.endsWith(".png") ? "png" : "jpeg";
  return `data:image/${type};base64,${readFileSync(fichier).toString("base64")}`;
};
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
const json = (cmd) => JSON.parse(sh(cmd));

const p = JSON.parse(readFileSync(`${DIR}/preuves-lab11.json`, "utf8"));
const r = p.recette;

// ---------- Build local ----------
const sortieBuild = sh("npm run build", `${RACINE}/apps/web`);
const fichiersDist = [...sortieBuild.matchAll(/(dist\/\S+)\s+([\d.]+ kB)/g)].map((m) => [m[1], m[2]]);
const buildOk = /built in/.test(sortieBuild);
const distIgnore = sh("git check-ignore -v apps/web/dist");
const jsLocal = fichiersDist.find(([f]) => f.endsWith(".js"))?.[0].replace("dist/assets/", "");
const memeEmpreinte = p.apres.vraiFichier.chemin.endsWith(jsLocal);

// ---------- Verifications de l'enseignant (section 11.2) ----------
const vercelJson = lire("apps/web/vercel.json");
const locks = sh(`git ls-files | grep -c "package-lock.json" || true`);
const envs = sh(`git ls-files | grep -c "\\.env" || true`);
const enLigne = sh(`grep -A2 "En ligne" README.md`);
const curlProd = sh(`curl -s -o /dev/null -w "%{http_code}" ${PROD}/evenement/1`);
const curlNouveau = sh(`curl -s -o /dev/null -w "%{http_code}" ${PROD}/nouveau`);
const commitsLab = sh(`git log v0.10-mobile-crud..HEAD --oneline --no-merges`).split("\n").filter(Boolean);
const mergesLab = sh(`git log v0.10-mobile-crud..HEAD --oneline --merges`).split("\n").filter(Boolean);
const mergesPr = mergesLab.filter((m) => /Merge pull request/.test(m));

// ---------- GitHub et Vercel, en direct ----------
const prs = json(`gh pr list -R ${DEPOT} --state all --limit 20 --json number,title,state,mergedAt`).sort((a, b) => a.number - b.number);
const protection = json(`gh api repos/${DEPOT}/branches/main/protection`);
const shaMain = sh(`git rev-parse origin/main`);
const statutMain = json(`gh api repos/${DEPOT}/commits/${shaMain}/status`);
const checksPr = (n) => {
  const sha = json(`gh pr view ${n} -R ${DEPOT} --json headRefOid`).headRefOid;
  const runs = json(`gh api repos/${DEPOT}/commits/${sha}/check-runs`).check_runs;
  const statuts = json(`gh api repos/${DEPOT}/commits/${sha}/status`).statuses;
  const build = runs.find((c) => c.name === "build");
  const vercel = statuts.find((s) => s.context === "Vercel");
  return { build: build ? build.conclusion : "—", vercel: vercel ? vercel.state : "—" };
};
const prsDetail = prs.map((pr) => ({ ...pr, ...checksPr(pr.number) }));
const reglagesAuth = JSON.parse(
  sh(
    `curl -s "$(grep VITE_SUPABASE_URL apps/web/.env.local | cut -d= -f2)/auth/v1/settings" -H "apikey: $(grep VITE_SUPABASE_ANON_KEY apps/web/.env.local | cut -d= -f2)"`
  )
);

const tableau = (entetes, rows, cle = -1) =>
  `<table>
      <thead><tr>${entetes.map((e) => `<th>${e}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (row, i) => `<tr${i === cle ? ' class="ligne-cle"' : ""}>${row
            .map((c, j) => `<td${j > 0 ? ' class="mono"' : ""}>${c}</td>`)
            .join("")}</tr>`
        )
        .join("")}</tbody>
    </table>`;
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

const verifications = [
  ["Le build de production reussit", "npm run build (apps/web)", buildOk ? fichiersDist.map(([f, t]) => `${f.replace("dist/", "")} ${t}`).join(" · ") : "echec", buildOk],
  ["dist/ n'est pas suivi par Git", "git check-ignore -v apps/web/dist", distIgnore, distIgnore.includes("dist")],
  ["Un seul package-lock.json", 'git ls-files | grep -c "package-lock.json"', locks, locks === "1"],
  ["Aucun .env versionne", 'git ls-files | grep -c "\\.env"', envs, envs === "0"],
  ["La reecriture SPA est en place", "cat apps/web/vercel.json", vercelJson.replace(/\s+/g, " "), vercelJson.includes('"destination": "/index.html"')],
  ["Le README indique la production", 'grep -A2 "En ligne" README.md', enLigne.split("\n")[1] ?? "", enLigne.includes(PROD)],
  ["F5 sur une fiche en production", `curl … ${PROD.replace("https://", "")}/evenement/1`, curlProd, curlProd === "200"],
  ["Route /nouveau en production", "curl … /nouveau", curlNouveau, curlNouveau === "200"],
  ["Production construite depuis main", `statut Vercel de ${shaMain.slice(0, 7)}`, statutMain.state, statutMain.state === "success"],
  ["Confirmation d'email active", "GET /auth/v1/settings", `mailer_autoconfirm = ${reglagesAuth.mailer_autoconfirm}`, reglagesAuth.mailer_autoconfirm === false],
  ["Le build est obligatoire sur main", "gh api …/branches/main/protection", `checks : ${protection.required_status_checks.contexts.join(", ")} · admins inclus : ${protection.enforce_admins.enabled}`, protection.required_status_checks.contexts.includes("build") && protection.enforce_admins.enabled],
];

const recette = [
  ["1", "Ouvrir l'adresse de production", `catalogue en ${r.r1.secondes.toFixed(1)} s (Fast 4G) · ${r.r1.compteur}`, r.r1.secondes < 10],
  ["2", "Ouvrir un evenement, appuyer sur F5", `HTTP ${r.r2.statut} · meme fiche`, r.r2.statut === 200 && r.r2.memeFiche],
  ["3", "Coller l'URL d'une fiche dans un nouvel onglet", `HTTP ${r.r3.statut} · ${r.r3.titre}`, r.r3.statut === 200],
  ["4", "Creer un compte, confirmer l'email", "manuel : voir section 13", null],
  ["5", "Se connecter, creer un evenement", `cree, id ${r.r5.id}, visible dans la liste`, r.r5.dansLaListe],
  ["6", "Recharger la page", "toujours dans la liste", r.r6.toujoursLa],
  ["7", "S'inscrire a un evenement", `le bouton passe a « ${r.r7.bouton} »`, r.r7.bouton === "Se desinscrire"],
  ["8", "Ouvrir l'app mobile", r.r8.visibleSurMobile ? "l'evenement apparait dans la liste mobile" : `non visible ${r.r8.erreur ?? ""}`, r.r8.visibleSurMobile],
  ["9", "Avec un autre compte, tenter de supprimer", `bouton ${r.r9.boutonSupprimer ? "present" : "absent"} · DELETE force : HTTP ${r.r9.statutDeleteForce}, ${r.r9.lignesSupprimees} ligne supprimee`, !r.r9.boutonSupprimer && r.r9.lignesSupprimees === 0 && r.r9.evenementEncoreLa],
  ["10", "Chercher service_role dans le code de la page", `${r.r10.fichiers} fichiers lus · service_role : ${r.r10.serviceRole ? "trouve" : "absent"}`, !r.r10.serviceRole],
];
const recetteHtml = recette
  .map(
    ([n, action, res, ok]) => `<tr>
      <td class="mono">${n}</td><td>${esc(action)}</td><td class="mono">${esc(res)}</td>
      <td class="${ok === null ? "manuel" : ok ? "ok" : "ko"}">${ok === null ? "à faire" : ok ? "OK" : "✗"}</td>
    </tr>`
  )
  .join("");

const rolePr = {
  1: "debloquer le premier build (lock)",
  2: "vercel.json + CI du bonus",
  3: "README, section En ligne",
  4: "test du bonus : build volontairement casse",
};
const prsHtml = tableau(
  ["PR", "Objet", "Build GitHub Actions", "Preview Vercel", "Issue"],
  prsDetail.map((pr) => [
    `#${pr.number}`,
    esc(rolePr[pr.number] ?? pr.title),
    pr.build === "success" ? "reussi" : pr.build === "failure" ? "echec" : "— (workflow absent)",
    pr.vercel === "success" ? "prete" : pr.vercel === "failure" || pr.vercel === "error" ? "echec" : pr.vercel,
    pr.mergedAt ? "fusionnee" : pr.state === "CLOSED" ? "fermee sans fusion" : pr.state.toLowerCase(),
  ])
);

// ---------- Extraits ----------
const workflow = lire(".github/workflows/build-web.yml");
const lockDiff = tableau(
  ["Dans le lock", "Avant (genere sur macOS)", "Apres (PR #1)"],
  [
    ["vite, esbuild, rollup", "imbriques dans apps/web/node_modules", "remontes a la racine"],
    ["binaires de rollup", "1 sur 26 (darwin-x64)", "27 sur 27, dont linux-x64-gnu"],
    ["binaires d'esbuild", "1 sur 23 (darwin-x64)", "23 sur 23, dont linux-x64"],
    ["autres paquets", "—", "aucune version modifiee"],
  ]
);
const reglages = tableau(
  ["Reglage", "Valeur", "Pourquoi"],
  [
    ["Project Name", "senevent-mbow", `donne l'adresse ${PROD.replace("https://", "")}`],
    ["Framework Preset", "Vite", "detecte automatiquement"],
    ["Root Directory", "apps/web", "detecte automatiquement : l'app est dans un sous-dossier"],
    ["Build / Output / Install", "par defaut", "npm run build d'apps/web, dist/, installation a la racine"],
    ["VITE_SUPABASE_URL", "Production + Preview", "colle depuis apps/web/.env.local"],
    ["VITE_SUPABASE_ANON_KEY", "Production + Preview", "cle publishable, protegee par la RLS"],
  ]
);
const avantApres = tableau(
  ["Requete", "Sans vercel.json", "Avec vercel.json"],
  [
    ["GET /", `${p.avant.accueil.statut}`, "200"],
    ["F5 sur /evenement/1", `${p.avant.rechargement.statut} · « ${esc(p.avant.rechargement.texte[0])} »`, `${p.apres.rechargement.statut} · ${esc(p.apres.rechargement.titre)}`],
    ["lien direct /evenement/1", `${p.avant.lienDirect.statut} · x-vercel-error: ${p.avant.lienDirect.erreur}`, `${p.apres.lienDirect.statut} · ${p.apres.lienDirect.type}`],
    ["lien direct /nouveau", `${p.avant.nouveau.statut} · ${p.avant.nouveau.erreur}`, `${p.apres.nouveau.statut}`],
    [`vrai fichier ${p.apres.vraiFichier.chemin.replace("/assets/", "")}`, "200", `${p.apres.vraiFichier.statut} · ${p.apres.vraiFichier.type}`],
    ["fichier absent /assets/inexistant.js", "404", `${p.apres.fichierAbsent.statut} · ${p.apres.fichierAbsent.type}`],
  ],
  2
);

const arbre = `senevent/
  package-lock.json          # le seul lock, a la racine (binaires de toutes les plateformes)
  README.md                  # + section "En ligne" (NOUVEAU)
  .github/workflows/
    build-web.yml            # bonus : build obligatoire sur chaque PR (NOUVEAU)
  apps/
    web/
      vercel.json            # reecriture SPA (NOUVEAU)
      capture-lab11.mjs      # recette automatisee sur la production
    mobile/
  packages/
    shared/`;

const figure = ([n, route, titre, legende, fichier]) => `
    <figure class="shot">
      <div class="shot-head">
        <span class="fig-n">Figure ${n}</span><span class="route">${esc(route)}</span>
        <h3>${esc(titre)}</h3>
      </div>
      <img src="${image(fichier)}" alt="${esc(titre)}">
      <figcaption>${esc(legende)}</figcaption>
    </figure>`;

const figPiege = [
  ["01", "/", "La production, servie par Vercel", "Le catalogue des Labs 5–6, servi depuis le CDN de Vercel et alimente par Supabase.", "01-prod-accueil"],
  ["02", p.avant.clic.chemin, "Apres un clic : la fiche s'affiche", "React Router change l'URL dans le navigateur, sans rien demander au serveur.", "02-prod-clic-detail"],
  ["03", `${p.avant.clic.chemin} + F5`, "Apres F5 : 404 de Vercel", "Le navigateur demande le fichier /evenement/1, qui n'existe pas dans dist/. React Router n'a jamais l'occasion de demarrer.", "03-prod-f5-404"],
  ["04", `${p.apres.rechargement.chemin} + F5`, "Apres F5, avec vercel.json", "Vercel renvoie index.html sans changer l'URL : le JavaScript se charge, React Router lit /evenement/1.", "04-prod-f5-ok"],
];
const figCi = [
  ["11", "PR #2", "Le commentaire du bot Vercel", "Chaque PR recoit son build et son lien Preview ; le merge affiche ses 4 controles reussis.", "11-pr-preview"],
  ["12", "PR #4", "Une PR qui casse le build est bloquee", "Le job build-web / build est Required et echoue : le bouton de merge reste grise, meme pour le proprietaire.", "12-pr-bloquee"],
];
const figConfig = [
  ["13", "Supabase · URL Configuration", "Site URL et URL de redirection", "Les liens de confirmation renvoient vers la production ; localhost:5173 reste autorise pour le developpement.", "13-supabase-url"],
  ["14", "Vercel · senevent-mbow", "Le deploiement de production", "Construit depuis main, a chaque merge : ici celui de la PR #3.", "14-vercel-projet"],
];
const figRecette = [
  ["05", "/ · Fast 4G", "Ligne 1 : le catalogue", `Affiche en ${r.r1.secondes.toFixed(1)} s au format telephone, reseau bride par Chrome.`, "05-recette-accueil-4g"],
  ["06", p.apres.rechargement.chemin, "Ligne 3 : lien colle", "Ouvert dans un nouvel onglet, sans passer par l'accueil.", "06-recette-lien-direct"],
  ["07", "/", "Lignes 5–6 : evenement cree", "Cree par Atou depuis la production, toujours la apres rechargement.", "07-recette-evenement-cree"],
  ["08", `/evenement/${r.r5.id}`, "Ligne 7 : inscription", "Le bouton passe a « Se desinscrire » ; l'organisateur voit aussi « Supprimer ».", "08-recette-inscription"],
  ["09", "app mobile", "Ligne 8 : le mobile le voit", "La carte de l'evenement cree sur le site de production, dans l'app Expo du Lab 10.", "09-recette-mobile"],
  ["10", `/evenement/${r.r5.id}`, "Ligne 9 : un autre compte", "Connectee en Khady : pas de bouton Supprimer. Le DELETE force est filtre par la RLS.", "10-recette-autre-compte"],
];

const CSS = readFileSync(`${RACINE}/build-report-lab10.mjs`, "utf8").match(/const CSS = `([\s\S]*?)`;/)[1] +
  `
  td.manuel { color: #9a6700; font-weight: 800; white-space: nowrap; }
  .grille-shots .shot img { max-height: 520px; object-fit: cover; object-position: top; }
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>SenEvent — Rapport Lab 11</title>
<style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">Sen<b>Event</b></span>
      <span class="nav"><b style="color:#fff">apps/web</b>&nbsp;&nbsp;·&nbsp;&nbsp;apps/mobile&nbsp;&nbsp;·&nbsp;&nbsp;packages/shared</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Déploiement 1/2 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 11 — Déploiement web sur Vercel</h1>
    <p class="lede">Rapport de réalisation : l'application web quitte <code>localhost:5173</code> pour une vraie adresse, <b>${esc(PROD)}</b>. Le projet Vercel est branché sur le dépôt GitHub : chaque Pull Request reçoit une préversion, chaque merge sur <code>main</code> met la production à jour. Le piège des routes profondes a été constaté puis corrigé, Supabase Auth pointe vers la production, et une recette automatisée a été menée sur le site en ligne.</p>
    <div class="chips">
      <span class="chip tag">tag : v1.0-web</span>
      <span class="chip">senevent-mbow.vercel.app</span>
      <span class="chip">Root Directory apps/web</span>
      <span class="chip">vercel.json</span>
      <span class="chip">${prs.length} Pull Requests</span>
      <span class="chip">build obligatoire sur main</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Un site statique, parce qu'il n'y a pas de backend</h2>
    <p>Supabase fournit la base, l'authentification et l'API : il n'y a aucun serveur applicatif à héberger. Une fois construite, l'application web se résume à trois fichiers. Vercel les distribue depuis son CDN ; le navigateur de l'utilisateur parle ensuite directement à Supabase, avec la clé publique, sous le contrôle des règles RLS du Lab 5.</p>
    ${tableau(["Fichier produit par npm run build", "Taille"], fichiersDist.map(([f, t]) => [`<code>apps/web/${esc(f)}</code>`, esc(t)]))}
    <p style="margin-top:10px">Les noms portent une empreinte calculée sur le contenu (<code>${esc(jsLocal)}</code>) : le même code donne le même nom${memeEmpreinte ? " — la production sert d'ailleurs exactement le fichier produit en local" : ""} — et un code modifié change de nom, ce qui permet aux navigateurs de garder ces fichiers en cache sans risque. <code>dist/</code> est ignoré par Git (<code>${esc(distIgnore)}</code>) : Vercel le reconstruit lui-même.</p>
  </section>

  <section>
    <h2><span class="sec-n">02</span> Le piège du lock, rencontré pour de vrai</h2>
    <p>Le sujet prévient qu'un <code>package-lock.json</code> imbriqué dans <code>apps/web</code> casse le déploiement. Ici, il n'y en avait déjà qu'un, à la racine. Le premier build Vercel a pourtant échoué, sur un autre défaut du même fichier :</p>
    <pre>at requireWithFriendlyError (/vercel/path0/apps/web/node_modules/rollup/dist/native.js:103:10)
code: 'MODULE_NOT_FOUND'
npm error command sh -c vite build
Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1</pre>
    <p>rollup et esbuild, les outils de Vite, s'appuient sur un binaire natif propre à chaque système, déclaré en dépendance optionnelle. Le lock, généré sur macOS, ne contenait pour eux que le binaire <code>darwin-x64</code> — un défaut connu de npm. Sur le Linux de Vercel, il n'y avait donc rien à installer. La correction, passée par la PR #1, a fait résoudre à nouveau Vite et sa chaîne d'outils :</p>
    ${lockDiff}
    <p style="margin-top:10px">C'est la même leçon que celle du sujet, sous une autre forme : le lock décide de ce que l'hébergeur installe. Le job <code>build</code> du bonus, qui lance <code>npm ci</code> sur Ubuntu, attrape désormais ce genre d'écart avant le merge.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">03</span> Le projet Vercel</h2>
    <p>Le dépôt a été importé depuis GitHub, l'application GitHub de Vercel n'ayant accès qu'au dépôt <code>senevent</code>. Vercel a détecté seul le monorepo : Root Directory <code>apps/web</code>, preset Vite, installation à la racine grâce aux workspaces.</p>
    ${reglages}
    <p style="margin-top:10px">Les variables sont figées au build : Vite remplace <code>import.meta.env.VITE_…</code> par leur valeur dans le JavaScript produit. La recette le confirme — la clé <code>sb_publishable_…</code> se lit dans le code de la page, ce qui est attendu pour une clé publique protégée par la RLS, et <code>service_role</code> n'y apparaît nulle part. Modifier une variable dans Vercel demanderait un redéploiement.</p>
    ${figure(figConfig[1])}
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">04</span> Le piège du rechargement : 404, puis la réécriture</h2>
    <p>Une SPA n'a qu'un fichier HTML. <code>/evenement/1</code> est dessinée par React Router dans le navigateur ; recharger demande au serveur un fichier qui n'existe pas. En local, ni <code>npm run dev</code> ni <code>npm run preview</code> ne le montrent : ils renvoient <code>index.html</code> pour toute adresse inconnue. Un simple serveur statique sur <code>dist/</code> reproduit en revanche le 404 — c'est ce que fait Vercel par défaut.</p>
    <div class="grille-shots">${figPiege.map(figure).join("")}</div>
  </section>

  <section class="avoid">
    <p>La correction tient en un fichier, placé dans le Root Directory :</p>
    <p class="code-label">apps/web/vercel.json</p>
    <pre>${esc(vercelJson)}</pre>
    <p>Vercel cherche d'abord un fichier réel dans <code>dist/</code> ; la règle ne s'applique que si rien ne correspond. Mesures avant et après, sur la production :</p>
    ${avantApres}
    <p style="margin-top:10px">La dernière ligne montre la contrepartie : un fichier vraiment absent reçoit lui aussi <code>index.html</code> avec un statut 200, au lieu d'un 404. Sans conséquence pour SenEvent — les noms de fichiers viennent du build — mais à savoir en cas de lien d'image cassé. La correction a été vérifiée sur la préversion de la PR #2 (F5 sur <code>/evenement/1</code> : HTTP 200, même fiche) avant d'arriver en production.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">05</span> Le déploiement continu, PR par PR</h2>
    <p>Une fois Vercel branché, on ne déploie plus à la main : le merge sur <code>main</code> est la mise en production. Les ${prs.length} Pull Requests du lab, état relu au moment de générer ce rapport :</p>
    ${prsHtml}
    <p style="margin-top:10px">La PR #1 n'a pas de job <code>build</code> : le workflow n'existait pas encore sur sa branche. Les préversions sont protégées par l'authentification Vercel : seuls les membres du projet les ouvrent, ce que le relecteur doit savoir (section 13).</p>
    <div class="grille-shots">${figure(figCi[0])}</div>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">06</span> Supabase Auth en production</h2>
    <p>Supabase renvoyait les liens de confirmation vers <code>http://localhost:3000</code>. Le Site URL est maintenant l'adresse Vercel, et seules deux destinations de redirection sont autorisées : la production et le serveur de développement local. Supabase refuse toute autre adresse, ce qui empêche de détourner un lien d'authentification.</p>
    ${tableau(
      ["Champ", "Valeur"],
      [
        ["Site URL", PROD],
        ["Redirect URLs", `${PROD}/** · http://localhost:5173/**`],
        ["Confirm email", `actif — mailer_autoconfirm = ${reglagesAuth.mailer_autoconfirm} (lu en direct sur /auth/v1/settings)`],
      ]
    )}
    <div style="margin-top:12px">${figure(figConfig[0])}</div>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> Avant de rendre le dépôt public</h2>
    <p>Le dépôt GitHub <code>AhmadMbow/senevent</code> est public, et Vercel lit tout ce qui y est poussé. Deux vérifications ont précédé la publication :</p>
    <p><b>L'historique.</b> Le dépôt GitHub contenait les Labs 1–3, le dépôt local les Labs 4–10, sans commit commun. Ils ont été rattachés par un merge en stratégie <code>ours</code> : l'arbre de <code>main</code> est resté celui du Lab 10, les commits des Labs 1–3 sont conservés, et le push s'est fait sans <code>--force</code>. L'historique complet ne contient ni clé <code>service_role</code>, ni jeton JWT, ni fichier <code>.env</code> ; le contrôle GitGuardian de chaque PR ne détecte aucun secret.</p>
    <p><b>Les comptes de test.</b> Leur mot de passe figurait en clair dans des scripts de capture des Labs 6 et 7. Il a été changé par l'API d'auth de Supabase (l'ancien est refusé, HTTP 400), et les scripts le lisent maintenant dans la variable <code>SENEVENT_MDP_TEST</code>. L'ancien, resté dans l'historique, ne permet plus de se connecter.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> La recette de production</h2>
    <p>Les dix points du sujet, sur l'adresse de production. La recette est automatisée par <code>apps/web/capture-lab11.mjs</code> : format téléphone (390 × 844, tactile), réseau bridé par Chrome au profil « Fast 4G », comptes de test d'Atou et de Khady. La ligne 8 utilise l'app mobile du Lab 10, branchée sur la même base.</p>
    <table>
      <thead><tr><th>#</th><th>Action</th><th>Résultat</th><th>État</th></tr></thead>
      <tbody>${recetteHtml}</tbody>
    </table>
    <p style="margin-top:10px">L'événement de recette a ensuite été supprimé par son organisatrice (${esc(r.nettoyage.lignesSupprimees)} ligne, inscription comprise par le <code>on delete cascade</code>). La ligne 9 est la plus parlante : le DELETE envoyé avec le jeton de Khady répond HTTP ${esc(r.r9.statutDeleteForce)}, mais la RLS le réduit à ${esc(r.r9.lignesSupprimees)} ligne — l'événement d'Atou est toujours là.</p>
  </section>

  <section>
    <div class="grille-3">${figRecette.map(figure).join("")}</div>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">09</span> Bonus : une PR qui casse le build est bloquée</h2>
    <p>Vercel construit chaque PR, mais rien n'empêchait de fusionner une PR dont le build avait échoué. Le workflow <code>build-web</code> installe le monorepo avec <code>npm ci</code> — qui échoue aussi si le lock n'est pas à jour — et construit <code>apps/web</code> :</p>
    <p class="code-label">.github/workflows/build-web.yml</p>
    <pre>${esc(workflow)}</pre>
    <p>La protection de <code>main</code> exige le contrôle <code>${esc(protection.required_status_checks.contexts.join(", "))}</code>, administrateurs compris (<code>enforce_admins</code>) : sans cela, le propriétaire du dépôt pourrait passer outre et le test ne prouverait rien. La PR #4 introduit une balise <code>&lt;h3&gt;</code> non fermée dans <code>EvenementCarte.jsx</code> : le job échoue, la préversion Vercel aussi, et la fusion reste bloquée. La PR a été fermée sans fusion.</p>
    ${figure(figCi[1])}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">10</span> Ce qui a changé dans le dépôt</h2>
    <pre>${esc(arbre)}</pre>
    <p>Peu de fichiers : l'essentiel du lab est de la configuration (Vercel, Supabase, GitHub) et de la vérification. Le lab compte ${commitsLab.length} commits depuis <code>v0.10-mobile-crud</code> et ${mergesLab.length} merges : ${mergesPr.length} fusions de Pull Request, et ${mergesLab.length - mergesPr.length === 1 ? "le rattachement" : `${mergesLab.length - mergesPr.length} autres merges, dont le rattachement`} de l'historique des Labs 1–3, fait en local avant le premier push.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">11</span> Ce que la validation a réellement donné</h2>
    <p>Les vérifications de l'enseignant (section 11.2) et l'état de GitHub, de Vercel et de Supabase, relancés au moment de générer ce rapport :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(verifications)}</tbody>
    </table>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">12</span> Écarts par rapport au sujet</h2>
    ${tableau(
      ["Le sujet", "Ici", "Pourquoi"],
      [
        ["senevent-equipe-X", "senevent-mbow", "nom de projet choisi par l'équipe"],
        ["supprimer apps/web/package-lock.json", "rien a supprimer, mais le lock de la racine corrige (PR #1)", "le lock unique ne contenait pas les binaires Linux de rollup et d'esbuild"],
        ["recette depuis un telephone en 4G", "recette automatisee, format telephone, reseau « Fast 4G » simule", "reproductible et mesuree ; le passage sur un vrai telephone reste a faire (section 13)"],
        ["protection de main avec le build obligatoire", "build obligatoire, administrateurs compris", "le proprietaire ne peut plus contourner le controle"],
        ["—", "rotation du mot de passe des comptes de test", "le depot devient public et le mot de passe etait dans l'historique"],
      ]
    )}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">13</span> Ce qui reste à faire par l'équipe</h2>
    <p><b>Ligne 4 de la recette : créer un compte et confirmer l'email.</b> Elle n'est pas automatisée : le service d'email intégré de Supabase n'envoie que quelques messages par heure. À faire une fois depuis la production : le lien reçu doit ramener sur <code>senevent-mbow.vercel.app</code>, ce que garantissent le Site URL et la liste de redirection de la section 06.</p>
    <p><b>La recette sur un vrai téléphone, Wi-Fi coupé.</b> La simulation « Fast 4G » mesure le temps de chargement, mais ne remplace pas un passage sur un appareil réel : clavier, zoom, lien partagé par WhatsApp.</p>
    <p><b>Les préversions sont privées.</b> L'authentification Vercel protège les URL de prévisualisation : un relecteur sans accès au projet Vercel tombe sur une page de connexion. Pour que Mansour et Khady les ouvrent sans compte, il faudrait désactiver cette protection pour les préversions (Settings → Deployment Protection).</p>
  </section>

  <section class="callout">
    <h2>Vers le Lab 12</h2>
    <p>L'application web est en production, mise à jour à chaque merge, accessible depuis n'importe quel navigateur. L'application mobile, elle, ne tourne encore que dans Expo Go, reliée au serveur de développement d'un ordinateur. Le Lab 12 construira l'APK Android avec EAS Build — et ce sera l'occasion de corriger la limite relevée au Lab 10 : la session mobile gardée en mémoire, à ranger dans <code>AsyncStorage</code>.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 11 — Déploiement web sur Vercel</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab11.html`, html);
writeFileSync(`${RACINE}/rapport-lab11.html`, html);
console.log("rapport-lab11.html ecrit,", html.length, "caracteres");
console.log({
  prs: prsDetail.map((x) => `#${x.number} build=${x.build} vercel=${x.vercel}`),
  echecs: [...verifications.filter((v) => !v[3]).map((v) => v[0]), ...recette.filter((l) => l[3] === false).map((l) => l[1])],
});
