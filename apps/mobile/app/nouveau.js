import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { creerEvenement } from "@senevent/shared";
import { useAuth } from "../context/AuthContext";
import { couleurs, rayons, espaces, CATEGORIES } from "../theme";

export default function Nouveau() {
  const { session, chargement } = useAuth();
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("concert");
  const [lieu, setLieu] = useState("");
  const [prix, setPrix] = useState("");
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Memes regles que NouvelEvenement.jsx du web. Elles ne remplacent pas la
  // base : les contraintes check du Lab 5 refusent aussi un titre trop court
  // ou un prix negatif.
  const valider = () => {
    const e = {};
    if (titre.trim().length < 3) {
      e.titre = "Le titre doit faire au moins 3 caracteres.";
    }
    if (lieu.trim().length < 2) {
      e.lieu = "Le lieu est requis.";
    }
    // La colonne prix est un entier : on n'accepte que des chiffres.
    if (!/^\d*$/.test(prix.trim())) {
      e.prix = "Le prix est un nombre entier de FCFA.";
    }
    return e;
  };

  // Corriger un champ efface son message d'erreur, sans attendre le prochain envoi.
  const saisir = (champ, setter) => (valeur) => {
    setter(valeur);
    setErreurs((e) => ({ ...e, [champ]: undefined }));
  };

  const soumettre = async () => {
    setErreurServeur(null);
    const trouvees = valider();
    setErreurs(trouvees);
    if (Object.keys(trouvees).length > 0) return;

    setEnCours(true);
    try {
      // organisateur_id = l'utilisateur connecte : c'est ce qu'exige la
      // policy RLS evenements_insert_auth (organisateur_id = auth.uid()).
      await creerEvenement({
        titre: titre.trim(),
        categorie,
        lieu_nom: lieu.trim(),
        date_debut: new Date().toISOString(),
        prix: Number(prix) || 0,
        organisateur_id: session.user.id,
      });
      router.back(); // retour a la liste, qui se recharge au focus
    } catch (e) {
      setErreurServeur(e.message);
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={couleurs.accent} />
      </View>
    );
  }

  // Le bouton "+" n'apparait que connecte, mais l'ecran reste joignable par
  // un lien direct (senevent://nouveau) : on ne montre pas un formulaire
  // qui serait refuse par la base.
  if (!session) {
    return (
      <View style={styles.centre}>
        <View style={styles.pastille}>
          <Ionicons name="lock-closed-outline" size={28} color={couleurs.texteDoux} />
        </View>
        <Text style={styles.titreEtat}>Connexion requise</Text>
        <Text style={styles.detailEtat}>
          Connectez-vous (onglet Profil) pour creer un evenement.
        </Text>
        <Pressable
          onPress={() => router.dismissTo("/profil")}
          style={({ pressed }) => [styles.boutonEtat, pressed && styles.enfonce]}
        >
          <Ionicons name="person" size={16} color={couleurs.fond} />
          <Text style={styles.boutonTexte}>Aller au profil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* handled : un toucher sur "Ajouter" alors que le clavier est ouvert
          declenche le bouton, au lieu de seulement fermer le clavier. */}
      <ScrollView
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={[styles.input, erreurs.titre && styles.inputErreur]}
          placeholder="Concert de jazz au Just 4 U"
          placeholderTextColor={couleurs.texteFaible}
          value={titre}
          onChangeText={saisir("titre", setTitre)}
        />
        {erreurs.titre && <Text style={styles.erreur}>{erreurs.titre}</Text>}

        <Text style={styles.label}>Categorie</Text>
        <View style={styles.categories}>
          {CATEGORIES.map((c) => {
            const actif = categorie === c.cle;
            return (
              <Pressable
                key={c.cle}
                onPress={() => setCategorie(c.cle)}
                style={[
                  styles.chip,
                  actif && { backgroundColor: c.couleur, borderColor: c.couleur },
                ]}
              >
                <Ionicons name={c.icone} size={14} color={actif ? "#fff" : c.couleur} />
                <Text style={actif ? styles.chipTexteActif : styles.chipTexte}>
                  {c.cle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={[styles.input, erreurs.lieu && styles.inputErreur]}
          placeholder="Institut francais, Dakar"
          placeholderTextColor={couleurs.texteFaible}
          value={lieu}
          onChangeText={saisir("lieu", setLieu)}
        />
        {erreurs.lieu && <Text style={styles.erreur}>{erreurs.lieu}</Text>}

        <Text style={styles.label}>Prix (FCFA, 0 = gratuit)</Text>
        <TextInput
          style={[styles.input, erreurs.prix && styles.inputErreur]}
          placeholder="0"
          placeholderTextColor={couleurs.texteFaible}
          value={prix}
          onChangeText={saisir("prix", setPrix)}
          keyboardType="number-pad"
        />
        {erreurs.prix && <Text style={styles.erreur}>{erreurs.prix}</Text>}

        <Text style={styles.aide}>
          La date de debut est l'instant de la creation, comme sur le web.
        </Text>

        {erreurServeur && (
          <Text style={[styles.erreur, styles.erreurServeur]}>
            Erreur : {erreurServeur}
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.bouton, (pressed || enCours) && styles.enfonce]}
          onPress={soumettre}
          disabled={enCours}
        >
          {enCours ? (
            <ActivityIndicator color={couleurs.fond} />
          ) : (
            <>
              <Ionicons name="add-circle" size={18} color={couleurs.fond} />
              <Text style={styles.boutonTexte}>Ajouter l'evenement</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    padding: espaces.l,
    paddingBottom: espaces.xl * 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: couleurs.texteDoux,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: espaces.l,
    marginBottom: espaces.s,
  },
  input: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    paddingHorizontal: espaces.l,
    paddingVertical: 13,
    fontSize: 16,
    color: couleurs.texte,
  },
  inputErreur: {
    borderColor: couleurs.erreur,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaces.s,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: espaces.m,
    paddingVertical: 8,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  chipTexte: {
    color: couleurs.texteDoux,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTexteActif: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  aide: {
    color: couleurs.texteFaible,
    fontSize: 12,
    marginTop: espaces.l,
  },
  erreur: {
    color: couleurs.erreur,
    fontSize: 13,
    marginTop: espaces.xs,
  },
  erreurServeur: {
    marginTop: espaces.m,
  },
  bouton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.s,
    backgroundColor: couleurs.accent,
    paddingVertical: 15,
    borderRadius: rayons.pilule,
    marginTop: espaces.xl,
  },
  boutonTexte: {
    color: couleurs.fond,
    fontSize: 16,
    fontWeight: "800",
  },
  enfonce: {
    opacity: 0.75,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espaces.xl,
    backgroundColor: couleurs.fond,
  },
  pastille: {
    width: 64,
    height: 64,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espaces.l,
  },
  titreEtat: {
    color: couleurs.texte,
    fontSize: 17,
    fontWeight: "700",
  },
  detailEtat: {
    color: couleurs.texteDoux,
    fontSize: 13,
    textAlign: "center",
    marginTop: espaces.xs,
    lineHeight: 19,
  },
  boutonEtat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: espaces.xl,
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.m,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.accent,
  },
});
