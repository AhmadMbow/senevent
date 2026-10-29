import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { couleurs, rayons } from "../theme";

// Bouton "+" affiche seulement si l'utilisateur est connecte.
// C'est un vrai composant React : il peut lire la session avec useAuth et
// naviguer avec useRouter, ou qu'on le place dans l'arborescence.
export default function BoutonAjouter() {
  const { session } = useAuth();
  const router = useRouter();

  if (!session) return null;

  return (
    <Pressable
      onPress={() => router.push("/nouveau")}
      accessibilityLabel="Nouvel evenement"
      hitSlop={8}
      style={({ pressed }) => [styles.bouton, pressed && styles.enfonce]}
    >
      <Ionicons name="add" size={26} color={couleurs.fond} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    width: 42,
    height: 42,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  enfonce: {
    opacity: 0.75,
  },
});
