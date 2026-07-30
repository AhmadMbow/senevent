import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons, espaces, CATEGORIES } from "../theme";

// Barre de filtres horizontale. Le filtrage se fait cote client sur la liste
// deja chargee : aucune requete supplementaire, donc aucune logique Supabase ici.
export default function FiltreCategories({ actif, onChange, compteurs }) {
  const options = [{ cle: null, label: "Tous", icone: "apps" }, ...CATEGORIES];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.zone}
      contentContainerStyle={styles.piste}
    >
      {options.map((option) => {
        const selectionne = actif === option.cle;
        const nombre = option.cle ? compteurs[option.cle] ?? 0 : compteurs.total;

        return (
          <Pressable
            key={option.cle ?? "tous"}
            onPress={() => onChange(option.cle)}
            style={({ pressed }) => [
              styles.puce,
              selectionne && styles.puceActive,
              pressed && styles.puceEnfoncee,
            ]}
          >
            <Ionicons
              name={option.icone}
              size={13}
              color={selectionne ? couleurs.fond : couleurs.texteDoux}
            />
            <Text style={[styles.libelle, selectionne && styles.libelleActif]}>
              {option.label}
            </Text>
            <Text style={[styles.compteur, selectionne && styles.compteurActif]}>
              {nombre}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Sans flexGrow: 0, la ScrollView horizontale est etiree puis ecrasee par
  // le conteneur flex parent et la barre de filtres disparait sous la liste.
  zone: {
    flexGrow: 0,
    flexShrink: 0,
  },
  piste: {
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
    gap: espaces.s,
  },
  puce: {
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
  puceActive: {
    backgroundColor: couleurs.accent,
    borderColor: couleurs.accent,
  },
  puceEnfoncee: {
    opacity: 0.65,
  },
  libelle: {
    color: couleurs.texteDoux,
    fontSize: 13,
    fontWeight: "600",
  },
  libelleActif: {
    color: couleurs.fond,
    fontWeight: "800",
  },
  compteur: {
    color: couleurs.texteFaible,
    fontSize: 11,
    fontWeight: "700",
  },
  compteurActif: {
    color: "rgba(11, 22, 34, 0.65)",
  },
});
