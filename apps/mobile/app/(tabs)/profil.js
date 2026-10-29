import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  seConnecter,
  sInscrire,
  seDeconnecter,
  mesInscriptions,
} from "@senevent/shared";
import { useAuth } from "../../context/AuthContext";
import { couleurs, rayons, espaces } from "../../theme";
import { jourDuMois, moisCourt, dateLisible, heure } from "../../format";

export default function Profil() {
  const { session, chargement } = useAuth();

  // Si la session est encore en cours de chargement
  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={couleurs.accent} />
      </View>
    );
  }

  // Si connecte : afficher le compte + deconnexion
  if (session) {
    return <CompteConnecte session={session} />;
  }

  // Sinon : le formulaire de connexion / inscription
  return <FormulaireAuth />;
}

function CompteConnecte({ session }) {
  const [inscriptions, setInscriptions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  // Le nom saisi a l'inscription est range dans les metadonnees du compte
  // (c'est la que le trigger du Lab 5 va le chercher pour creer le profil).
  const nom = session.user.user_metadata?.nom;

  // Bonus. useFocusEffect plutot que useEffect, pour la raison vue a
  // l'etape 3 : on s'inscrit depuis l'ecran de detail, et l'onglet Profil,
  // reste monte en arriere-plan, doit se mettre a jour quand on y revient.
  useFocusEffect(
    useCallback(() => {
      const charger = async () => {
        try {
          const data = await mesInscriptions(session.user.id);
          // Les plus proches d'abord, comme la liste des evenements.
          data.sort((a, b) =>
            a.evenements.date_debut.localeCompare(b.evenements.date_debut)
          );
          setInscriptions(data);
          setErreur(null);
        } catch (e) {
          setErreur(e.message);
        } finally {
          setChargement(false);
        }
      };
      charger();
    }, [session.user.id])
  );

  const deconnecter = async () => {
    setErreur(null);
    try {
      await seDeconnecter();
      // Pas de navigation : onAuthStateChange remet la session a null et
      // l'ecran se redessine tout seul avec le formulaire.
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <FlatList
      style={styles.ecran}
      contentContainerStyle={styles.contenuCompte}
      data={inscriptions}
      keyExtractor={(item) => String(item.evenement_id)}
      renderItem={({ item }) => <LigneInscription inscription={item} />}
      ListHeaderComponent={
        <View>
          <View style={styles.avatar}>
            <Text style={styles.initiale}>
              {(nom ?? session.user.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.titre}>{nom ?? "Mon profil"}</Text>
          <Text style={styles.email}>{session.user.email}</Text>

          <Text style={styles.section}>
            Mes inscriptions{chargement ? "" : ` · ${inscriptions.length}`}
          </Text>
          {chargement && (
            <ActivityIndicator color={couleurs.accent} style={styles.margeHaut} />
          )}
        </View>
      }
      ListEmptyComponent={
        chargement ? null : (
          <Text style={styles.vide}>
            Aucune inscription pour l'instant. Ouvrez un evenement et touchez
            « S'inscrire ».
          </Text>
        )
      }
      ListFooterComponent={
        <View style={styles.margeHaut}>
          {erreur && <Text style={styles.erreur}>{erreur}</Text>}
          <Pressable
            style={({ pressed }) => [styles.boutonDeco, pressed && styles.enfonce]}
            onPress={deconnecter}
          >
            <Ionicons name="log-out-outline" size={18} color={couleurs.accentClair} />
            <Text style={styles.boutonDecoTexte}>Se deconnecter</Text>
          </Pressable>
        </View>
      }
    />
  );
}

// Une ligne de "Mes inscriptions" : toucher ramene au detail de l'evenement.
function LigneInscription({ inscription }) {
  const { titre, date_debut } = inscription.evenements;
  return (
    <Link href={`/evenement/${inscription.evenement_id}`} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={[styles.ligne, pressed && styles.enfonce]}>
            <View style={styles.pastilleDate}>
              <Text style={styles.pastilleJour}>{jourDuMois(date_debut)}</Text>
              <Text style={styles.pastilleMois}>{moisCourt(date_debut)}</Text>
            </View>
            <View style={styles.ligneTextes}>
              <Text style={styles.ligneTitre} numberOfLines={1}>
                {titre}
              </Text>
              <Text style={styles.ligneDate}>
                {dateLisible(date_debut)} a {heure(date_debut)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={couleurs.texteFaible} />
          </View>
        )}
      </Pressable>
    </Link>
  );
}

function FormulaireAuth() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [info, setInfo] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const inscription = mode === "signup";

  // Memes regles que le formulaire web (required, minLength="6") : le
  // navigateur les verifiait tout seul, ici c'est a nous de le faire.
  const valider = () => {
    if (inscription && nom.trim().length < 2) return "Indiquez votre nom.";
    if (!email.trim()) return "Indiquez votre email.";
    if (motDePasse.length < 6) {
      return "Le mot de passe doit faire au moins 6 caracteres.";
    }
    return null;
  };

  const soumettre = async () => {
    setErreur(null);
    setInfo(null);
    const probleme = valider();
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setEnCours(true);
    try {
      if (inscription) {
        const { session } = await sInscrire(email.trim(), motDePasse, nom.trim());
        // Le projet exige la confirmation de l'email : le compte est cree,
        // mais Supabase ne rend pas de session tant que le lien n'est pas clique.
        if (!session) {
          setInfo(
            `Compte cree. Confirmez l'email envoye a ${email.trim()}, puis connectez-vous.`
          );
          setMode("login");
          setMotDePasse("");
        }
      } else {
        await seConnecter(email.trim(), motDePasse);
      }
      // La session se met a jour toute seule via onAuthStateChange
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  };

  const basculer = () => {
    setMode(inscription ? "login" : "signup");
    setErreur(null);
    setInfo(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.avatar}>
        <Ionicons
          name={inscription ? "person-add-outline" : "person-outline"}
          size={30}
          color={couleurs.texteDoux}
        />
      </View>
      <Text style={styles.titre}>
        {inscription ? "Creer un compte" : "Se connecter"}
      </Text>
      <Text style={styles.sousTitre}>Le meme compte que sur senevent-mbow.vercel.app.</Text>

      {inscription && (
        <TextInput
          style={styles.input}
          placeholder="Nom d'affichage"
          placeholderTextColor={couleurs.texteFaible}
          autoCapitalize="words"
          value={nom}
          onChangeText={setNom}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={couleurs.texteFaible}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={couleurs.texteFaible}
        secureTextEntry
        textContentType={inscription ? "newPassword" : "password"}
        returnKeyType="go"
        onSubmitEditing={soumettre}
        value={motDePasse}
        onChangeText={setMotDePasse}
      />

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.bouton,
          (pressed || enCours) && styles.enfonce,
        ]}
        onPress={soumettre}
        disabled={enCours}
      >
        {enCours ? (
          <ActivityIndicator color={couleurs.fond} />
        ) : (
          <Text style={styles.boutonTexte}>
            {inscription ? "Creer le compte" : "Se connecter"}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={basculer}>
        <Text style={styles.basculer}>
          {inscription
            ? "Deja un compte ? Se connecter"
            : "Pas de compte ? En creer un"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: espaces.xl,
    justifyContent: "center",
    backgroundColor: couleurs.fond,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.fond,
  },
  avatar: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espaces.l,
  },
  initiale: {
    color: couleurs.accent,
    fontSize: 30,
    fontWeight: "800",
  },
  titre: {
    fontSize: 22,
    fontWeight: "800",
    color: couleurs.texte,
    textAlign: "center",
  },
  sousTitre: {
    fontSize: 13,
    color: couleurs.texteDoux,
    textAlign: "center",
    marginTop: espaces.xs,
    marginBottom: espaces.xl,
  },
  email: {
    fontSize: 15,
    color: couleurs.texteDoux,
    textAlign: "center",
    marginTop: espaces.xs,
    marginBottom: espaces.xl,
  },
  input: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.l,
    paddingVertical: 14,
    fontSize: 16,
    color: couleurs.texte,
    marginBottom: espaces.m,
  },
  bouton: {
    backgroundColor: couleurs.accent,
    paddingVertical: 15,
    borderRadius: rayons.pilule,
    alignItems: "center",
    marginTop: espaces.xs,
  },
  boutonTexte: {
    color: couleurs.fond,
    fontSize: 16,
    fontWeight: "800",
  },
  enfonce: {
    opacity: 0.75,
  },
  boutonDeco: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.s,
    paddingVertical: 14,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: "rgba(234, 125, 43, 0.5)",
    backgroundColor: "rgba(234, 125, 43, 0.12)",
  },
  boutonDecoTexte: {
    color: couleurs.accentClair,
    fontSize: 16,
    fontWeight: "700",
  },
  basculer: {
    color: couleurs.accentClair,
    textAlign: "center",
    marginTop: espaces.l,
    fontWeight: "600",
  },
  erreur: {
    color: couleurs.erreur,
    textAlign: "center",
    marginBottom: espaces.m,
  },
  info: {
    color: couleurs.succes,
    textAlign: "center",
    marginBottom: espaces.m,
    lineHeight: 19,
  },
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenuCompte: {
    padding: espaces.xl,
  },
  section: {
    color: couleurs.texteDoux,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: espaces.m,
  },
  margeHaut: {
    marginTop: espaces.xl,
  },
  vide: {
    color: couleurs.texteFaible,
    fontSize: 14,
    lineHeight: 20,
  },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.m,
    padding: espaces.m,
    marginBottom: espaces.s,
    borderRadius: rayons.m,
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  pastilleDate: {
    width: 46,
    paddingVertical: 6,
    borderRadius: rayons.s,
    backgroundColor: couleurs.voile,
    alignItems: "center",
  },
  pastilleJour: {
    color: couleurs.texte,
    fontSize: 17,
    fontWeight: "800",
  },
  pastilleMois: {
    color: couleurs.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ligneTextes: {
    flex: 1,
  },
  ligneTitre: {
    color: couleurs.texte,
    fontSize: 15,
    fontWeight: "700",
  },
  ligneDate: {
    color: couleurs.texteDoux,
    fontSize: 12,
    marginTop: 2,
  },
});
