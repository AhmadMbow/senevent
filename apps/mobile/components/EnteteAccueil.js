import { View, Text, StyleSheet, Platform, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons, espaces } from "../theme";

// En-tete de l'ecran d'accueil : degrade, marque et compteur d'evenements.
// SafeAreaView ne protege que iOS ; sur Android on compense la barre d'etat
// nous-memes avec StatusBar.currentHeight.
const HAUTEUR_BARRE = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

export default function EnteteAccueil({ nombre, chargement }) {
  const sousTitre = chargement
    ? "Chargement des evenements..."
    : `${nombre} evenement${nombre > 1 ? "s" : ""} a Dakar`;

  return (
    <LinearGradient
      colors={[couleurs.fondEntete, "#102437", couleurs.fond]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.entete, { paddingTop: HAUTEUR_BARRE + espaces.l }]}
    >
      <View style={styles.rangee}>
        <View style={styles.logo}>
          <Ionicons name="calendar" size={20} color={couleurs.accent} />
        </View>

        <View style={styles.textes}>
          <Text style={styles.marque}>
            Sen<Text style={styles.marqueAccent}>Event</Text>
          </Text>
          <Text style={styles.sousTitre}>{sousTitre}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  entete: {
    paddingHorizontal: espaces.l,
    paddingBottom: espaces.l,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  rangee: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.m,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: rayons.m,
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.voileFort,
    alignItems: "center",
    justifyContent: "center",
  },
  textes: {
    flex: 1,
  },
  marque: {
    color: couleurs.texte,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  marqueAccent: {
    color: couleurs.accent,
  },
  sousTitre: {
    color: couleurs.texteDoux,
    fontSize: 13,
    marginTop: 2,
  },
});
