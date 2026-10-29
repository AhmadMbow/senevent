import { useState, useEffect } from "react";
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { estInscrit, inscrire, desinscrire } from "@senevent/shared";
import { useAuth } from "../context/AuthContext";
import { couleurs, rayons, espaces } from "../theme";

// Le BoutonInscription.jsx du web (Lab 6), traduit en natif : Pressable au
// lieu de button, StyleSheet au lieu de CSS. La logique est la meme, puisque
// ce sont les memes fonctions partagees. Seule difference : la session vient
// du contexte au lieu d'une prop.
export default function BoutonInscription({ evenementId }) {
  const { session } = useAuth();
  const router = useRouter();
  const [inscrit, setInscrit] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Rejoue a chaque changement de session : se connecter depuis l'onglet
  // Profil pendant que ce detail est ouvert met le bouton a jour.
  useEffect(() => {
    const verifier = async () => {
      if (!session) {
        setChargement(false);
        return;
      }
      setChargement(true);
      const resultat = await estInscrit(evenementId, session.user.id);
      setInscrit(resultat);
      setChargement(false);
    };
    verifier();
  }, [evenementId, session]);

  if (!session) {
    return (
      <Pressable
        onPress={() => router.dismissTo("/profil")}
        style={({ pressed }) => [styles.info, pressed && styles.enfonce]}
      >
        <Ionicons name="lock-closed-outline" size={16} color={couleurs.texteDoux} />
        <Text style={styles.infoTexte}>
          Connectez-vous (onglet Profil) pour vous inscrire.
        </Text>
      </Pressable>
    );
  }

  if (chargement) {
    return <ActivityIndicator color={couleurs.accent} style={styles.marge} />;
  }

  // La policy inscriptions_insert_self impose utilisateur_id = auth.uid() :
  // on ne peut inscrire que soi-meme, quoi qu'envoie le client.
  const basculer = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      if (inscrit) {
        await desinscrire(evenementId, session.user.id);
        setInscrit(false);
      } else {
        await inscrire(evenementId, session.user.id);
        setInscrit(true);
      }
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <View style={styles.marge}>
      {inscrit && (
        <View style={styles.confirmation}>
          <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
          <Text style={styles.confirmationTexte}>Vous etes inscrit a cet evenement</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.bouton,
          inscrit ? styles.desinscrire : styles.inscrire,
          (pressed || enCours) && styles.enfonce,
        ]}
        onPress={basculer}
        disabled={enCours}
      >
        {enCours ? (
          <ActivityIndicator color={inscrit ? couleurs.accentClair : couleurs.fond} />
        ) : (
          <>
            <Ionicons
              name={inscrit ? "close-circle-outline" : "ticket-outline"}
              size={18}
              color={inscrit ? couleurs.accentClair : couleurs.fond}
            />
            <Text style={inscrit ? styles.texteDesinscrire : styles.texte}>
              {inscrit ? "Se desinscrire" : "S'inscrire a cet evenement"}
            </Text>
          </>
        )}
      </Pressable>

      {erreur && <Text style={styles.erreur}>Erreur : {erreur}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  marge: {
    marginTop: espaces.xl,
  },
  bouton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.s,
    paddingVertical: 15,
    borderRadius: rayons.pilule,
  },
  inscrire: {
    backgroundColor: couleurs.succes,
  },
  desinscrire: {
    backgroundColor: "rgba(234, 125, 43, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(234, 125, 43, 0.5)",
  },
  enfonce: {
    opacity: 0.75,
  },
  texte: {
    color: couleurs.fond,
    fontSize: 16,
    fontWeight: "800",
  },
  texteDesinscrire: {
    color: couleurs.accentClair,
    fontSize: 16,
    fontWeight: "700",
  },
  confirmation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: espaces.m,
  },
  confirmationTexte: {
    color: couleurs.succes,
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    marginTop: espaces.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.s,
    paddingVertical: espaces.l,
    paddingHorizontal: espaces.l,
    borderRadius: rayons.l,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: couleurs.voileFort,
  },
  infoTexte: {
    color: couleurs.texteDoux,
    fontSize: 14,
    fontStyle: "italic",
  },
  erreur: {
    color: couleurs.erreur,
    textAlign: "center",
    marginTop: espaces.s,
  },
});
