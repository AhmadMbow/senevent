import { View, Text, Image, StyleSheet } from "react-native";

// Affiche un evenement sous forme de carte.
// Meme donnee et meme palette que EvenementCarte.jsx du web :
// seule la couche d'affichage change (View/Text/StyleSheet au lieu de div/p/CSS).
export default function EvenementCarte({ evenement }) {
  const prix = evenement.prix === 0 ? "Gratuit" : `${evenement.prix} FCFA`;

  const date = new Date(evenement.date_debut).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.carte}>
      {evenement.image_url && (
        <Image source={{ uri: evenement.image_url }} style={styles.image} />
      )}

      <View style={styles.contenu}>
        <Text style={styles.titre}>{evenement.titre}</Text>
        <Text style={styles.lieu}>{evenement.lieu_nom}</Text>
        <Text style={styles.date}>{date}</Text>

        <View style={styles.pied}>
          <Text style={styles.categorie}>{evenement.categorie}</Text>
          <Text style={styles.prix}>{prix}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    elevation: 3, // ombre Android
    shadowColor: "#000", // ombre iOS
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: "100%",
    height: 150,
  },
  contenu: {
    padding: 12,
  },
  titre: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a3a5c",
  },
  lieu: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  pied: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  categorie: {
    fontSize: 12,
    color: "#fff",
    backgroundColor: "#ea7d2b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    textTransform: "uppercase",
    overflow: "hidden", // arrondit le fond du badge sur iOS
  },
  prix: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea7d2b",
  },
});
