// Lab 10 — Generateur du rapport HTML.
// Lit les captures et les preuves produites par apps/mobile/capture-lab10.mjs,
// et refait ici les verifications de l'enseignant (section 9.2), le controle
// de types du package partage, le build web et les bundles natifs.
// Rien n'est ecrit en dur cote resultats.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const RACINE = "/Users/babacarmbow/Desktop/Projets dev/senevent";
const DIR = process.env.CAPTURES_DIR ?? "/tmp/senevent-lab10-screens";

const b64 = (chemin) =>
  `data:image/png;base64,${readFileSync(chemin).toString("base64")}`;
const shot = (nom) => b64(`${DIR}/${nom}.png`);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lire = (rel) => readFileSync(`${RACINE}/${rel}`, "utf8").trimEnd();
const version = (paquet) =>
  JSON.parse(readFileSync(`${RACINE}/node_modules/${paquet}/package.json`, "utf8")).version;

const sh = (cmd, cwd = RACINE) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
  }
};
const reussit = (cmd, cwd = RACINE) => {
  try {
    execSync(cmd, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const p = JSON.parse(readFileSync(`${DIR}/preuves-lab10.json`, "utf8"));

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
  // Les fichiers du lab doivent etre dans le bundle natif, pas seulement sur le web.
  const contient = (fichier) => sources.some((s) => s.endsWith(fichier));
  return {
    modules: m ? Number(m[1]) : null,
    react: [...copies("react")],
    reactNative: [...copies("react-native")],
    fichiersLab: ["context/AuthContext.js", "app/nouveau.js", "components/BoutonInscription.js"].every(contient),
  };
}
const android = bundle("android");
const ios = bundle("ios");
const unique = (b) => b.react.length === 1 && b.reactNative.length === 1;

// ---------- Verifications de l'enseignant (section 9.2) ----------
const contextePresent = sh(`test -f apps/mobile/context/AuthContext.js && echo OK || echo MANQUE`);
const lecteursContexte = sh(`grep -rl "useAuth\\|AuthProvider" apps/mobile/app`).split("\n").filter(Boolean);
const appelantsPartages = sh(
  `git grep -l "creerEvenement\\|inscrire\\|seConnecter" -- apps/mobile/app apps/mobile/components`
).split("\n").filter(Boolean);
const appelsDirects = sh(`git grep -n "supabase\\.from\\|createClient" -- apps/mobile | wc -l`);
// La commande du sujet, telle quelle : elle parcourt aussi node_modules.
const appelsDirectsLitteral = sh(
  `grep -rc "supabase.from\\|createClient" apps/mobile 2>/dev/null | grep -vc ':0$' || true`
);
const importsSupabase = sh(
  `git grep -l "@supabase/supabase-js" -- apps/mobile/app apps/mobile/components apps/mobile/context | wc -l`
);
const envSuivi = sh(`git ls-files | grep -c "apps/mobile/.env$" || true`);
const typesPartages = reussit("npx tsc --noEmit -p packages/shared");
const buildWeb = reussit("npm run build", `${RACINE}/apps/web`);
const appelantsUseAuth = sh(`git grep -l "= useAuth()" -- apps/mobile/app apps/mobile/components`)
  .split("\n")
  .filter(Boolean);
const commitsLab = sh(`git log v0.9-router..HEAD --oneline --no-merges`).split("\n").filter(Boolean);

const court = (liste) => liste.map((f) => f.replace("apps/mobile/", "")).join(" · ");

const verifications = [
  ["Le contexte existe", "test -f apps/mobile/context/AuthContext.js", contextePresent, contextePresent === "OK"],
  ["Les ecrans lisent le contexte", 'grep -rl "useAuth\\|AuthProvider" apps/mobile/app', court(lecteursContexte), lecteursContexte.length >= 3],
  ["Les actions passent par le package partage", 'git grep -l "creerEvenement\\|inscrire\\|seConnecter"', court(appelantsPartages), appelantsPartages.length >= 3],
  ["Aucun appel Supabase direct (fichiers suivis)", 'git grep "supabase.from\\|createClient" -- apps/mobile', `${appelsDirects} occurrence`, appelsDirects === "0"],
  ["Aucun appel Supabase direct (commande du sujet)", 'grep -rc "supabase.from\\|createClient" apps/mobile', `${appelsDirectsLitteral} fichier non nul`, appelsDirectsLitteral === "0"],
  ["supabase-js jamais importe par les ecrans", 'git grep "@supabase/supabase-js" -- app components context', `${importsSupabase} fichier`, importsSupabase === "0"],
  ["Le .env mobile n'est pas versionne", 'git ls-files | grep -c "apps/mobile/.env$"', `${envSuivi} fichier suivi`, envSuivi === "0"],
  ["Types du package partage (bonus inclus)", "npx tsc --noEmit -p packages/shared", typesPartages ? "aucune erreur" : "erreurs", typesPartages],
  ["Le web construit toujours", "npm run build (apps/web)", buildWeb ? "build Vite reussi" : "echec", buildWeb],
  ["Bundle Android", "npx expo export --platform android", `${android.modules} modules`, Boolean(android.modules) && android.fichiersLab],
  ["Bundle iOS", "npx expo export --platform ios", `${ios.modules} modules`, Boolean(ios.modules) && ios.fichiersLab],
  ["Une seule copie de React", "sources de la sourcemap Android", `react : ${android.react.join(", ")} · react-native : ${android.reactNative.join(", ")}`, unique(android)],
];

const parcours = [
  ["Deconnecte : pas de bouton +", "en-tete de la liste", p.deconnecte.boutonPlus ? "visible" : "absent", !p.deconnecte.boutonPlus],
  ["Formulaire de connexion", "champs de l'onglet Profil", `${p.formulaire.champs.join(" · ")} (type=${p.formulaire.motDePasseMasque})`, p.formulaire.champs.length === 2 && p.formulaire.motDePasseMasque === "password"],
  ["Mode inscription : champ Nom en plus", "basculer le formulaire", p.inscriptionCompte.champs.join(" · "), p.inscriptionCompte.champs.length === 3],
  ["Mot de passe trop court arrete localement", "appels /auth/v1/signup", `${p.inscriptionCompte.appelsSignup} appel · message affiche`, p.inscriptionCompte.message && p.inscriptionCompte.appelsSignup === 0],
  ["Mauvais mot de passe", "seConnecter() refuse", `HTTP ${p.mauvaisMotDePasse.statut} · ${p.mauvaisMotDePasse.message}`, p.mauvaisMotDePasse.statut === 400],
  ["Connexion", "seConnecter() + onAuthStateChange", `HTTP ${p.connexion.statut} · nom et email affiches`, p.connexion.statut === 200 && p.connexion.nomAffiche && p.connexion.formulaireRemplace],
  ["Connecte : le bouton + apparait", "en-tete de la liste", p.connecte.boutonPlus ? "visible" : "absent", p.connecte.boutonPlus],
  ["useFocusEffect recharge la liste", "GET /evenements au retour sur l'onglet", `+${p.connecte.rechargementAuFocus}`, p.connecte.rechargementAuFocus === 1],
  ["Formulaire vide refuse localement", "POST /evenements", `${p.validationCreation.requetesEnvoyees} requete · 2 messages`, p.validationCreation.requetesEnvoyees === 0 && p.validationCreation.titre && p.validationCreation.lieu],
  ["Creation depuis le mobile", "creerEvenement() puis router.back()", `HTTP ${p.creation.statutInsert} · ${p.creation.cheminApres} · ${p.creation.nombreAvant} → ${p.creation.nombreApres} evenements`, p.creation.statutInsert === 201 && p.creation.nombreApres === p.creation.nombreAvant + 1],
  ["L'organisateur est le compte connecte", "profiles(nom) de l'evenement cree", p.creation.organisateur, p.creation.organisateur === "Atou Diop"],
  ["Le web voit l'evenement du mobile", "liste et detail de apps/web", `organisateur affiche · image cassee : ${p.webVoitMobile.imageCassee ? "oui" : "non"}`, p.webVoitMobile.organisateur && !p.webVoitMobile.imageCassee],
  ["Khady cree un evenement sur le web", "formulaire du Lab 6", `HTTP ${p.webCree.statutInsert}`, p.webCree.statutInsert === 201],
  ["Le mobile le voit au retour sur la liste", "GET /evenements, aucune action manuelle", `+${p.mobileVoitWeb.rechargements} · organisateur ${p.mobileVoitWeb.organisateur}`, p.mobileVoitWeb.rechargements === 1 && p.mobileVoitWeb.organisateur === "Khady Ndiaye"],
  ["Inscription depuis le mobile", "inscrire() puis lecture directe de la table", `HTTP ${p.inscription.statutInsert} · ${p.inscription.lignesEnBase} ligne au nom d'Atou`, p.inscription.statutInsert === 201 && p.inscription.ligneDuCompteA],
  ["Le web voit l'inscription", "detail web, connecte en Atou", p.webVoitInscription.bouton, p.webVoitInscription.bouton === "Se desinscrire"],
  ["Bonus : Mes inscriptions", "mesInscriptions() au focus du Profil", `${p.bonus.inscriptionsAvant} → ${p.bonus.inscriptionsApres}`, p.bonus.contientEvenementWeb && p.bonus.inscriptionsApres === p.bonus.inscriptionsAvant + 1],
  ["Deconnexion", "seDeconnecter()", `HTTP ${p.deconnexion.statut} · formulaire revenu · + absent`, p.deconnexion.formulaireRevenu && !p.deconnexion.boutonPlus],
  ["Detail deconnecte", "BoutonInscription sans session", p.deconnexion.detailInvite ? "invite a se connecter" : "bouton affiche", p.deconnexion.detailInvite],
  ["Lien direct vers /nouveau, deconnecte", "ecran protege puis bouton", `Connexion requise → ${p.gardeNouveau.cheminApresBouton}`, p.gardeNouveau.cheminApresBouton === "/profil"],
  ["Nettoyage des donnees de test", "DELETE par chaque organisateur (RLS)", `${p.nettoyage.evenementMobile} + ${p.nettoyage.evenementWeb} evenement supprime`, p.nettoyage.evenementMobile === 1 && p.nettoyage.evenementWeb === 1],
  ["Aucune erreur JavaScript", "pageerror, web et mobile", `${p.erreursJs.length} erreur`, p.erreursJs.length === 0],
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

const tableau = (entetes, rows, cle = -1) =>
  `<table>
      <thead><tr>${entetes.map((e) => `<th>${e}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (r, i) => `<tr${i === cle ? ' class="ligne-cle"' : ""}>${r
            .map((c, j) => `<td${j > 0 ? ' class="mono"' : ""}>${c}</td>`)
            .join("")}</tr>`
        )
        .join("")}</tbody>
    </table>`;

// ---------- Extraits de code reels ----------
const extrait = (rel, debut, fin, plus = 0) => {
  const L = lire(rel).split("\n");
  const i = L.findIndex((l) => l.includes(debut));
  const j = L.findIndex((l, k) => k > i && l.includes(fin));
  return L.slice(i, j + 1 + plus).join("\n");
};
// L'element JSX qui contient une ligne donnee, de sa balise ouvrante a "/>".
const element = (rel, marqueur, ouvrante) => {
  const L = lire(rel).split("\n");
  const m = L.findIndex((l) => l.includes(marqueur));
  let i = m;
  while (i > 0 && !L[i].includes(ouvrante)) i--;
  let j = m;
  while (j < L.length && !L[j].trim().endsWith("/>")) j++;
  const marge = L[i].match(/^\s*/)[0].length;
  return L.slice(i, j + 1).map((l) => l.slice(marge)).join("\n");
};
const sansMarge = (bloc) => {
  const L = bloc.split("\n");
  const marge = Math.min(...L.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return L.map((l) => l.slice(marge)).join("\n");
};

const PROFIL = "apps/mobile/app/(tabs)/profil.js";
const contexte = extrait("apps/mobile/context/AuthContext.js", "const AuthContext = createContext", "return useContext(AuthContext);", 1);
const layout = sansMarge(extrait("apps/mobile/app/_layout.js", "<AuthProvider>", "</AuthProvider>"))
  .replace(/screenOptions=\{\{[\s\S]*?\n(\s*)\}\}/, "screenOptions={{ /* theme sombre, inchange depuis le Lab 9 */ }}");
const champMdp = element(PROFIL, 'placeholder="Mot de passe"', "<TextInput");
const branchesAuth = sansMarge(extrait(PROFIL, "if (inscription) {", "// La session se met a jour toute seule"));
const clavier = sansMarge(extrait(PROFIL, "<KeyboardAvoidingView", 'behavior={Platform.OS', 1));
const boutonAjouter = extrait("apps/mobile/components/BoutonAjouter.js", "export default function BoutonAjouter", "if (!session) return null;");
const enteteAction = sansMarge(extrait("apps/mobile/app/(tabs)/index.js", "<EnteteAccueil", "/>"));
const focus = sansMarge(extrait("apps/mobile/app/(tabs)/index.js", "useFocusEffect(", "}, [charger])", 1));
const creation = sansMarge(extrait("apps/mobile/app/nouveau.js", "await creerEvenement({", "router.back();"));
const puces = sansMarge(extrait("apps/mobile/app/nouveau.js", "{CATEGORIES.map((c) => {", "})}"));
const basculer = sansMarge(extrait("apps/mobile/components/BoutonInscription.js", "const basculer = async", "};"));
const partagee = extrait("packages/shared/src/inscriptions.ts", "export async function mesInscriptions", "return data ?? [];", 1);

const arbre = `apps/mobile/
  app/
    _layout.js               # Stack + AuthProvider + initSupabase (+ ecran nouveau)
    nouveau.js               # creation d'evenement : creerEvenement()
    (tabs)/
      _layout.js             # navigateur Tabs
      index.js               # liste : useFocusEffect + bouton "+"
      profil.js              # connexion / inscription / deconnexion + Mes inscriptions
    evenement/
      [id].js                # detail + BoutonInscription
  components/
    BoutonAjouter.js         # "+" visible seulement si connecte
    BoutonInscription.js     # estInscrit / inscrire / desinscrire
    EnteteAccueil.js         # en-tete de marque, emplacement "action"
    EvenementCarte.js · FiltreCategories.js · CarteSquelette.js
  context/
    AuthContext.js           # AuthProvider + useAuth
  theme.js · format.js · metro.config.js · app.json
packages/shared/src/
  inscriptions.ts            # + mesInscriptions (bonus)`;

// ---------- Figures ----------
const figuresMobile = [
  ["01", "/", "Deconnecte", `La liste du Lab 9, ${p.deconnecte.cartes} evenements. Sans session, BoutonAjouter rend null : l'en-tete n'a pas de bouton +.`, "01-liste-deconnecte"],
  ["02", "/profil", "Formulaire de connexion", "L'ancien placeholder est remplace par FormulaireAuth : deux TextInput, le mot de passe masque par secureTextEntry.", "02-profil-formulaire"],
  ["03", "/profil", "Creer un compte", "Le mode inscription ajoute le nom d'affichage, comme sur le web. Un mot de passe de 3 caracteres est refuse avant tout appel reseau.", "03-inscription-validation"],
  ["04", "/profil", "Mauvais mot de passe", "Supabase repond 400 ; seConnecter() leve l'erreur, le formulaire l'affiche tel quel.", "04-connexion-erreur"],
  ["05", "/profil", "Connecte", "onAuthStateChange a mis la session a jour dans le contexte : le formulaire laisse place au compte, sans navigation ni rechargement.", "05-profil-connecte"],
  ["06", "/", "Le bouton + apparait", "Le meme en-tete, une fois connecte. BoutonAjouter lit la session avec useAuth et pousse /nouveau avec useRouter.", "06-liste-connecte"],
  ["07", "/nouveau", "Formulaire vide", "Les regles du formulaire web, verifiees avant l'envoi : aucune requete n'est partie.", "07-nouveau-validation"],
  ["08", "/nouveau", "Formulaire rempli", "Les puces de categorie remplacent le <select> du web ; le prix se saisit au pave numerique.", "08-nouveau-rempli"],
  ["09", "/", "Retour a la liste", `router.back(), puis useFocusEffect recharge : ${p.creation.nombreAvant} → ${p.creation.nombreApres} evenements. Sans affiche, la carte prend la couleur de sa categorie.`, "09-liste-apres-creation"],
  ["12", "/", "Le mobile voit le web", `L'evenement de Khady, cree sur le site, apparait des le retour sur l'onglet (+${p.mobileVoitWeb.rechargements} requete).`, "12-mobile-voit-evenement-web"],
  ["13", `/evenement/${p.mobileVoitWeb.id}`, "Inscription depuis le telephone", "inscrire() : le bouton passe a Se desinscrire. La ligne est relue directement dans la table inscriptions.", "13-mobile-inscription"],
  ["15", "/profil", "Bonus : Mes inscriptions", `mesInscriptions() relue au focus du Profil : ${p.bonus.inscriptionsAvant} → ${p.bonus.inscriptionsApres}. Toucher une ligne ouvre son detail.`, "15-profil-mes-inscriptions"],
  ["16", `/evenement/${p.creation.id}`, "Detail, deconnecte", "Apres seDeconnecter(), BoutonInscription invite a se connecter ; le toucher mene a l'onglet Profil.", "16-detail-deconnecte"],
  ["17", "/nouveau", "Lien direct, deconnecte", "L'ecran de creation reste joignable par senevent://nouveau : il refuse d'afficher un formulaire que la RLS rejetterait.", "17-nouveau-deconnecte"],
];
const figuresWeb = [
  ["10", `localhost:5173/`, "Le web voit le mobile", "Le catalogue web du Lab 6, sans rien changer a son code : la carte « Concert test mobile (Lab 10) » creee depuis le telephone est la, en derniere position (tri par date).", "10-web-liste-evenement-mobile"],
  ["11", `localhost:5173/evenement/${p.creation.id}`, "Le detail web de l'evenement mobile", "Organise par Atou Diop : organisateur_id vient de session.user.id cote mobile. Sans affiche, la page n'affiche plus d'image cassee (correctif de ce lab).", "11-web-detail-evenement-mobile"],
  ["14", `localhost:5173/evenement/${p.mobileVoitWeb.id}`, "Le web voit l'inscription", "Atou se connecte sur le site : pour l'evenement de Khady, le bouton est deja Se desinscrire. L'inscription a ete faite depuis le telephone.", "14-web-voit-inscription"],
];
const figure = ([n, route, titre, legende, fichier]) => `
    <figure class="shot">
      <div class="shot-head">
        <span class="fig-n">Figure ${n}</span><span class="route">${esc(route)}</span>
        <h3>${esc(titre)}</h3>
      </div>
      <img src="${shot(fichier)}" alt="${esc(titre)}">
      <figcaption>${esc(legende)}</figcaption>
    </figure>`;

// ---------- Tableaux de contenu ----------
const capacites = tableau(
  ["Capacite", "Web", "Mobile au Lab 9", "Mobile au Lab 10"],
  [
    ["Se connecter, creer un compte", "Lab 5", "—", "onglet Profil"],
    ["Voir la liste", "Lab 5", "Lab 8", "Lab 8, rechargee au focus"],
    ["Voir le detail", "Lab 4", "Lab 9", "Lab 9, avec inscription"],
    ["Creer un evenement", "Lab 6", "—", "ecran nouveau.js"],
    ["S'inscrire a un evenement", "Lab 6", "—", "BoutonInscription"],
    ["Logique metier", "@senevent/shared", "@senevent/shared", "@senevent/shared"],
  ],
  5
);
const pieces = tableau(
  ["Piece", "Role", "Dans SenEvent"],
  [
    ["<code>createContext</code>", "cree le contexte et sa valeur par defaut", "{ session: null, chargement: true }"],
    ["<code>&lt;Context.Provider&gt;</code>", "fournit la valeur a toute la sous-arborescence", "AuthProvider, autour du Stack racine"],
    ["<code>useContext</code>", "lit la valeur depuis n'importe quel descendant", `useAuth() : ${appelantsUseAuth.length} fichiers l'appellent`],
  ]
);
const saisie = tableau(
  ["Prop de TextInput", "Equivalent web", "Utilisee pour"],
  [
    ["<code>value</code> + <code>onChangeText</code>", "value + onChange", "champ controle ; onChangeText donne le texte, pas un evenement"],
    ["<code>secureTextEntry</code>", 'type="password"', "masquer le mot de passe"],
    ['<code>keyboardType="email-address"</code>', 'type="email"', "clavier avec @, sans majuscule (autoCapitalize)"],
    ['<code>keyboardType="number-pad"</code>', 'type="number"', "le prix, entier"],
    ["<code>onSubmitEditing</code>", "submit du &lt;form&gt;", "la touche Entree du clavier envoie le formulaire"],
  ]
);
const ecarts = tableau(
  ["Le sujet", "Ici", "Pourquoi"],
  [
    ["Styles clairs (#1a3a5c, #f0f4f8)", "theme sombre de theme.js", "la charte des Labs 8 et 9 ; meme structure de composants, memes props"],
    ["<code>headerRight</code> dans (tabs)/_layout.js", "BoutonAjouter passe a EnteteAccueil par sa prop <code>action</code>", "l'onglet masque l'en-tete du navigateur depuis le Lab 9 (headerShown: false) : un headerRight n'y serait jamais dessine"],
    ["<code>sInscrire(email, motDePasse)</code>", "un champ Nom, et le cas « pas de session »", "le nom alimente le trigger du Lab 5 comme sur le web ; la confirmation d'email est active, signUp ne rend donc pas de session"],
    ["un message d'erreur unique", "erreurs par champ, effacees a la saisie", "parite avec NouvelEvenement.jsx ; le prix doit etre un entier (colonne integer)"],
    ["rien si deconnecte sur /nouveau", "ecran « Connexion requise »", "l'ecran reste joignable par un lien direct senevent://nouveau"],
    ["basculer sans protection", "try/catch et etat enCours", "un double toucher violerait unique(evenement_id, utilisateur_id) ; parite avec le bouton web"],
    ["bonus avec <code>useEffect</code>", "<code>useFocusEffect</code>", "l'onglet Profil reste monte : la lecon de l'etape 3 s'applique aussi a lui"],
    ["—", "web : pas de &lt;img&gt; si image_url est null", "un evenement cree sur mobile n'a pas d'affiche ; le detail web affichait une image cassee"],
    ["—", "SDK 57 commite en tete de branche", "la montee de version d'Expo faite apres le Lab 9 n'etait pas commitee ; le lab part d'un etat reproductible"],
  ]
);
const demo = tableau(
  ["Etape du sujet", "Ce qui s'est passe"],
  [
    ["1. Sur le web, creer « Concert test »", `Khady (compte B) remplit le formulaire du Lab 6 : HTTP ${p.webCree.statutInsert}.`],
    ["2. Sur le mobile, revenir a la liste", "Atou passe sur l'onglet Profil puis revient : useFocusEffect relance getEvenements(), sans tirer pour rafraichir."],
    ["3. « Concert test » apparait", `Figure 12 : organisateur ${esc(p.mobileVoitWeb.organisateur)}, lu par la jointure profiles(nom).`],
    ["4. S'y inscrire depuis le mobile", `inscrire() : HTTP ${p.inscription.statutInsert} (figure 13).`],
    ["5. Sur le web, l'inscription est visible", `La table inscriptions contient ${p.inscription.lignesEnBase} ligne pour cet evenement, au nom d'Atou ; connecte sur le site, Atou voit Se desinscrire (figure 14).`],
    ["Et dans l'autre sens", `L'evenement cree sur le telephone (HTTP ${p.creation.statutInsert}) apparait dans le catalogue web et sur sa page de detail (figures 10 et 11).`],
  ]
);

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
  .code-label { break-after: avoid; page-break-after: avoid; }
  .grille-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; align-items: start; }
  .grille-3 .shot { margin-bottom: 10px; }
  .grille-3 .shot-head h3 { font-size: 9.5pt; }
  .grille-3 .shot-head .route { display: inline-block; margin: 3px 0 0; margin-left: 0; }
  .grille-3 figcaption { font-size: 7.6pt; padding: 8px 10px; }
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>SenEvent — Rapport Lab 10</title>
<style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="top">
      <span class="logo">Sen<b>Event</b></span>
      <span class="nav">apps/web&nbsp;&nbsp;·&nbsp;&nbsp;<b style="color:#fff">apps/mobile</b>&nbsp;&nbsp;·&nbsp;&nbsp;packages/shared</span>
    </div>
    <p class="eyebrow">DAWM · Bloc Mobile 3/3 · M1 RETEL — DMI/FST/UCAD</p>
    <h1>Lab 10 — Auth et catalogue complet côté mobile</h1>
    <p class="lede">Rapport de réalisation : l'application mobile, jusqu'ici en lecture seule, sait maintenant se connecter, créer un compte, publier un événement et s'y inscrire. La session est partagée par un contexte React, les formulaires sont natifs, et chaque action appelle les fonctions de <code>@senevent/shared</code> déjà utilisées par le web. La démo croisée l'a vérifié sur la vraie base : ce qui est créé d'un côté est vu, et modifié, de l'autre.</p>
    <div class="chips">
      <span class="chip tag">tag : v0.10-mobile-crud</span>
      <span class="chip">Expo SDK ${esc(version("expo").split(".")[0])} · React Native ${esc(version("react-native"))}</span>
      <span class="chip">AuthProvider + useAuth</span>
      <span class="chip">TextInput · KeyboardAvoidingView</span>
      <span class="chip">useFocusEffect</span>
      <span class="chip">${esc(appelsDirects)} appel Supabase en dur</span>
    </div>
  </div>

  <section class="avoid">
    <h2><span class="sec-n">01</span> Le mobile rattrape le web</h2>
    <p>À la fin du Lab 9, l'application mobile savait naviguer mais seulement regarder. Le web, lui, connecte, crée et inscrit depuis les Labs 5 et 6. Toute cette logique existait déjà dans le package partagé : il restait à construire l'interface native par-dessus.</p>
    ${capacites}
    <p style="margin-top:10px">La dernière ligne n'a pas bougé de tout le lab : aucune fonction métier n'a été réécrite côté mobile. Le seul ajout au package partagé est <code>mesInscriptions()</code>, pour le bonus — et elle est aussitôt disponible pour le web.</p>
  </section>

  <section>
    <h2><span class="sec-n">02</span> Le contexte React remplace le passage de props</h2>
    <p>Au Lab 5, <code>App.jsx</code> détenait la session et la passait en prop à <code>NavBar</code> et <code>Detail</code>. Avec Expo Router, les écrans sont rendus par le routeur : l'onglet Profil et l'écran de détail n'ont pas de parent commun qui pourrait la leur transmettre. Le contexte rend la session disponible à toute une sous-arborescence, et n'importe quel écran la lit avec <code>useAuth()</code>.</p>
    ${pieces}
    <p class="code-label" style="margin-top:12px">apps/mobile/context/AuthContext.js</p>
    <pre>${esc(contexte)}</pre>
    <p>C'est exactement la logique de session du Lab 5 — <code>getSession</code>, <code>onAuthStateChange</code>, désabonnement au démontage — rangée dans un contexte plutôt que dans <code>App.jsx</code>. Le layout racine enveloppe tout le Stack, et déclare au passage l'écran de création :</p>
    <p class="code-label">apps/mobile/app/_layout.js</p>
    <pre>${esc(layout)}</pre>
  </section>

  <section class="pb">
    <h2><span class="sec-n">03</span> L'onglet Profil : connexion, inscription, déconnexion</h2>
    <p>L'écran a trois états, choisis d'après le contexte : session en chargement (indicateur), connecté (le compte et le bouton de déconnexion), déconnecté (le formulaire). Le passage de l'un à l'autre n'est jamais provoqué par l'écran lui-même : après <code>seConnecter()</code> ou <code>seDeconnecter()</code>, c'est <code>onAuthStateChange</code> qui met le contexte à jour, et tous les écrans abonnés se redessinent.</p>
    ${saisie}
    <div class="two-col" style="margin-top:12px">
      <div>
        <p class="code-label">Le champ mot de passe</p>
        <pre>${esc(champMdp)}</pre>
      </div>
      <div>
        <p class="code-label">Le clavier ne cache pas le champ</p>
        <pre>${esc(clavier)}</pre>
        <p style="font-size:9pt;color:var(--muted)">Quand le clavier monte, <code>KeyboardAvoidingView</code> décale le contenu pour que le champ actif reste visible. iOS se comporte mieux avec <code>padding</code>, Android avec <code>height</code>.</p>
      </div>
    </div>
    <p><b>Compte ou événement ?</b> <code>sInscrire</code> crée un compte, <code>inscrire</code> inscrit à un événement. Ici, on parle de compte. Le sujet suppose que la session arrive aussitôt après <code>sInscrire</code> ; sur ce projet, la confirmation d'email est active (Lab 6) : Supabase crée le compte mais ne rend pas de session tant que le lien n'est pas cliqué. L'écran le dit au lieu de rester muet :</p>
    <pre>${esc(branchesAuth)}</pre>
    <p>Comme sur le web, le mode inscription demande aussi un nom d'affichage : il part dans les métadonnées du compte, où le trigger du Lab 5 le lit pour créer la ligne <code>profiles</code> (sans lui, le profil s'appellerait « Invite »). Les règles que le navigateur vérifiait seul (<code>required</code>, <code>minLength="6"</code>) sont vérifiées à la main : le parcours mesure ${esc(p.inscriptionCompte.appelsSignup)} appel à <code>/auth/v1/signup</code> pour un mot de passe trop court.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">04</span> Le bouton « + » et l'écran de création</h2>
    <p>Le bouton est un vrai composant React : il lit la session avec <code>useAuth</code> pour ne s'afficher que connecté, et navigue avec <code>useRouter</code>.</p>
    <pre>${esc(boutonAjouter)}</pre>
    <p>Le sujet le place dans <code>headerRight</code>, l'emplacement de droite de l'en-tête du navigateur. Mais l'onglet Événements masque cet en-tête depuis le Lab 9, pour garder l'en-tête de marque (dégradé, compteur) : un <code>headerRight</code> n'y serait jamais dessiné. <code>EnteteAccueil</code> reçoit donc une prop <code>action</code> qui joue le même rôle :</p>
    <pre>${esc(enteteAction)}</pre>
    <p>L'écran <code>nouveau.js</code> appelle <code>creerEvenement()</code>. <code>organisateur_id</code> vaut l'id de l'utilisateur connecté : c'est ce qu'exige la policy <code>evenements_insert_auth</code> du Lab 5. Une fois l'insertion faite, <code>router.back()</code> ramène à la liste.</p>
    <pre>${esc(creation)}</pre>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">05</span> Des puces à la place du &lt;select&gt;</h2>
    <p>React Native n'a pas de liste déroulante simple. On mappe les catégories de <code>theme.js</code> en <code>Pressable</code>, et le style de la puce choisie se combine au style de base : <code>[styles.chip, actif &amp;&amp; {…}]</code>, l'équivalent natif d'une classe conditionnelle. Chaque puce reprend l'icône et la couleur de sa catégorie, les mêmes que sur les cartes.</p>
    <pre>${esc(puces)}</pre>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">06</span> useFocusEffect : recharger au retour</h2>
    <p>Après <code>router.back()</code>, la liste réapparaît… sans le nouvel événement. Un onglet n'est pas démonté quand on le quitte : il reste en mémoire, et un <code>useEffect(fn, [])</code> ne repasse pas. <code>useFocusEffect</code> relance le chargement chaque fois que l'écran redevient visible ; <code>useCallback</code> évite de recréer la fonction à chaque rendu.</p>
    <pre>${esc(focus)}</pre>
    <p>Le parcours le mesure : revenir sur l'onglet ajoute ${esc(p.connecte.rechargementAuFocus)} requête <code>GET /evenements</code>, et la liste passe de ${esc(p.creation.nombreAvant)} à ${esc(p.creation.nombreApres)} événements après la création. Au Lab 9, le même retour ne rechargeait rien : c'est le comportement voulu qui a changé. Les squelettes de chargement ne s'affichent qu'au premier passage ; les suivants remplacent la liste sans la vider.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">07</span> S'inscrire à un événement</h2>
    <p><code>BoutonInscription</code> est le composant web du Lab 6 traduit en natif : <code>Pressable</code> au lieu de <code>button</code>, <code>StyleSheet</code> au lieu de CSS, et la session lue dans le contexte au lieu d'une prop. La logique tient dans les trois fonctions partagées.</p>
    <pre>${esc(basculer)}</pre>
    <p>La policy <code>inscriptions_insert_self</code> impose <code>utilisateur_id = auth.uid()</code> : on ne peut inscrire que soi-même, quoi qu'envoie le client. L'état <code>enCours</code> désactive le bouton pendant l'appel ; un double toucher aurait sinon tenté une seconde insertion, refusée par la contrainte <code>unique(evenement_id, utilisateur_id)</code>. La vérification <code>estInscrit</code> est rejouée à chaque changement de session : se connecter depuis l'onglet Profil, détail ouvert, met le bouton à jour.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">08</span> Bonus : « Mes inscriptions »</h2>
    <p>Une fonction de lecture ajoutée au package partagé. Supabase suit la clé étrangère <code>evenement_id</code> et ramène le titre et la date de chaque événement dans la même requête.</p>
    <p class="code-label">packages/shared/src/inscriptions.ts</p>
    <pre>${esc(partagee)}</pre>
    <p>Le sujet suggère de la charger dans un <code>useEffect</code>. Mais l'inscription se fait depuis l'écran de détail, pendant que l'onglet Profil reste monté en arrière-plan : c'est le piège de l'étape 3. La liste est donc relue avec <code>useFocusEffect</code> ; le parcours la voit passer de ${esc(p.bonus.inscriptionsAvant)} à ${esc(p.bonus.inscriptionsApres)} en revenant sur l'onglet. Chaque ligne est un <code>Link</code> vers le détail de l'événement.</p>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">09</span> La démo croisée : deux clients, une base</h2>
    <p>L'expérience proposée par le sujet, faite avec les deux comptes de test du Lab 6 : Khady sur le site web, Atou sur le téléphone. L'app web du Lab 6 tourne sans modification de logique.</p>
    ${demo}
    <div style="margin-top:14px">${figure(figuresWeb[0])}</div>
  </section>

  <section class="avoid">
    <div class="grille-shots">${figuresWeb.slice(1).map(figure).join("")}</div>
    <p>Les deux événements de test ont ensuite été supprimés, chacun par son organisateur — seule personne autorisée par la policy <code>evenements_delete_owner</code>. Leurs inscriptions sont parties avec, par le <code>on delete cascade</code> du Lab 5 : la base est revenue à son état d'avant la démo.</p>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">10</span> Écarts assumés par rapport au sujet</h2>
    <p>Le code du sujet a été suivi pour la structure, les noms et la logique. Voici ce qui diffère, et pourquoi :</p>
    ${ecarts}
  </section>

  <section class="avoid">
    <h2><span class="sec-n">11</span> Structure livrée</h2>
    <pre>${esc(arbre)}</pre>
  </section>

  <section class="avoid pb">
    <h2><span class="sec-n">12</span> Ce que la validation a réellement donné</h2>
    <p>Les vérifications de l'enseignant (section 9.2), le contrôle de types, le build web et les bundles natifs, relancés au moment de générer ce rapport :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Commande / méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(verifications)}</tbody>
    </table>
    <p style="margin-top:10px">Les bundles natifs contiennent bien <code>AuthContext.js</code>, <code>nouveau.js</code> et <code>BoutonInscription.js</code> : le code du lab n'est pas propre à la cible web. Le lab compte ${commitsLab.length} commits depuis <code>v0.9-router</code>, dans l'ordre de merge imposé : contexte et Profil (A), puis création (B) et inscription (C), puis le bonus.</p>
  </section>

  <section class="avoid">
    <p>Le parcours, piloté par <code>apps/mobile/capture-lab10.mjs</code> sur l'application réelle, la vraie base et l'app web à côté :</p>
    <table>
      <thead><tr><th>Contrôle</th><th>Méthode</th><th>Résultat</th><th>OK</th></tr></thead>
      <tbody>${lignes(parcours)}</tbody>
    </table>
  </section>

  <section class="avoid">
    <h2><span class="sec-n">13</span> Limites connues</h2>
    <p><b>La session ne survit pas à la fermeture de l'app.</b> <code>initSupabase</code> crée le client sans option de stockage. Dans un navigateur, supabase-js range alors la session dans <code>localStorage</code> ; sur un vrai téléphone, il n'y a pas de <code>localStorage</code> et il la garde en mémoire. Dans Expo Go, il faut donc se reconnecter après avoir fermé l'application. La correction classique est de passer <code>AsyncStorage</code> en option <code>auth.storage</code> — utile pour l'APK du Lab 12.</p>
    <p><b>Les messages d'erreur de Supabase restent en anglais</b> (« Invalid login credentials »), comme sur le web : les deux affichent <code>e.message</code> tel quel.</p>
    <p><b>La date d'un événement créé est l'instant de la création</b>, comme sur le web. Un vrai sélecteur de date demanderait un composant natif supplémentaire.</p>
  </section>

  <section class="pb">
    <h2><span class="sec-n">14</span> L'application, en situation</h2>
    <p>Captures au format téléphone, sur la cible web d'Expo — le même dossier <code>app/</code> que celui exécuté dans Expo Go, rendu dans un navigateur pour pouvoir piloter le parcours par script. Le chemin de chaque écran est indiqué en tête de figure.</p>
    <div class="grille-3">${figuresMobile.map(figure).join("")}</div>
  </section>

  <section class="callout">
    <h2>Vers le Lab 11</h2>
    <p>Web et mobile font désormais la même chose, sur la même base : c'est la fin du développement. Mais tout tourne encore en local — le web sur <code>localhost:5173</code>, le mobile par Expo Go sur le réseau de l'équipe. Le Lab 11 met l'application web en ligne sur Vercel, avec ses variables d'environnement côté hébergeur ; le Lab 12 construira l'APK Android avec EAS Build.</p>
  </section>

  <div class="foot"><span>SenEvent · Rapport Lab 10 — Auth et catalogue complet côté mobile</span><span>M1 RETEL · DAWM</span></div>
</body>
</html>`;

writeFileSync(`${DIR}/rapport-lab10.html`, html);
writeFileSync(`${RACINE}/rapport-lab10.html`, html);
console.log("rapport-lab10.html ecrit,", html.length, "caracteres");
console.log({
  android,
  ios,
  echecs: [...verifications, ...parcours].filter((r) => !r[3]).map((r) => r[0]),
});
