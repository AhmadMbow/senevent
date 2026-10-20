import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons, espaces } from "../../theme";

// Placeholder : la connexion et l'inscription arrivent au Lab 10, avec
// seConnecter / sInscrire / seDeconnecter du package partage.
export default function Profil() {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={34} color={couleurs.texteDoux} />
      </View>
      <Text style={styles.titre}>Mon profil</Text>
      <Text style={styles.texte}>
        La connexion et l'inscription arriveront au Lab 10.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: espaces.xl,
    backgroundColor: couleurs.fond,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.voile,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espaces.l,
  },
  titre: {
    fontSize: 20,
    fontWeight: "700",
    color: couleurs.texte,
  },
  texte: {
    fontSize: 14,
    color: couleurs.texteDoux,
    marginTop: espaces.s,
    textAlign: "center",
    lineHeight: 20,
  },
});
