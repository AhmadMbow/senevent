import { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { couleurs, rayons, espaces, voileAffiche, infosCategorie } from "../theme";
import { jourDuMois, moisCourt, dateLisible, heure, formaterPrix } from "../format";

// Carte d'un evenement : affiche en fond, pastille de date, badge de categorie,
// titre et informations pratiques.
// Meme donnee que EvenementCarte.jsx du web, seule la couche d'affichage change.
export default function EvenementCarte({ evenement }) {
  const [imageCassee, setImageCassee] = useState(false);
  const categorie = infosCategorie(evenement.categorie);
  const afficherImage = evenement.image_url && !imageCassee;

  return (
    <View style={styles.carte}>
      <View style={styles.zoneAffiche}>
        {afficherImage ? (
          <Image
            source={{ uri: evenement.image_url }}
            style={styles.affiche}
            resizeMode="cover"
            onError={() => setImageCassee(true)}
          />
        ) : (
          // Repli quand l'evenement n'a pas d'affiche ou qu'elle ne charge pas :
          // un aplat aux couleurs de la categorie plutot qu'un trou blanc.
          <View style={[styles.affiche, { backgroundColor: categorie.couleur }]}>
            <Ionicons
              name={categorie.icone}
              size={44}
              color="rgba(255, 255, 255, 0.35)"
            />
          </View>
        )}

        {/* Fond degrade : l'affiche se fond dans la carte, le texte reste lisible. */}
        <LinearGradient
          colors={voileAffiche}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.pastilleDate}>
          <Text style={styles.pastilleJour}>{jourDuMois(evenement.date_debut)}</Text>
          <Text style={styles.pastilleMois}>{moisCourt(evenement.date_debut)}</Text>
        </View>
      </View>

      <View style={styles.contenu}>
        <View style={styles.ligneHaute}>
          <View style={[styles.badge, { backgroundColor: categorie.couleur }]}>
            <Ionicons name={categorie.icone} size={11} color="#fff" />
            <Text style={styles.badgeTexte}>{evenement.categorie}</Text>
          </View>
          <Text style={styles.prix}>{formaterPrix(evenement.prix)}</Text>
        </View>

        <Text style={styles.titre} numberOfLines={2}>
          {evenement.titre}
        </Text>

        <View style={styles.meta}>
          <Ionicons name="location-outline" size={13} color={couleurs.texteDoux} />
          <Text style={styles.metaTexte} numberOfLines={1}>
            {evenement.lieu_nom}
          </Text>
        </View>

        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={couleurs.texteDoux} />
          <Text style={styles.metaTexte}>
            {dateLisible(evenement.date_debut)} a {heure(evenement.date_debut)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayons.l,
    marginHorizontal: espaces.l,
    marginBottom: espaces.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: "hidden",
    elevation: 6, // ombre Android
    shadowColor: "#000", // ombre iOS
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  zoneAffiche: {
    height: 190,
    backgroundColor: couleurs.fond,
  },
  affiche: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  pastilleDate: {
    position: "absolute",
    top: espaces.m,
    left: espaces.m,
    minWidth: 52,
    paddingVertical: 6,
    paddingHorizontal: espaces.s,
    borderRadius: rayons.m,
    backgroundColor: "rgba(11, 22, 34, 0.82)",
    borderWidth: 1,
    borderColor: couleurs.voileFort,
    alignItems: "center",
  },
  pastilleJour: {
    color: couleurs.texte,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  pastilleMois: {
    color: couleurs.accentClair,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  contenu: {
    paddingHorizontal: espaces.l,
    paddingBottom: espaces.l,
    paddingTop: espaces.xs,
  },
  ligneHaute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: espaces.s,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: espaces.s,
    paddingVertical: 3,
    borderRadius: rayons.pilule,
    overflow: "hidden", // arrondit le fond du badge sur iOS
  },
  badgeTexte: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  prix: {
    color: couleurs.accentClair,
    fontSize: 14,
    fontWeight: "800",
  },
  titre: {
    color: couleurs.texte,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
    marginBottom: espaces.s,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  metaTexte: {
    color: couleurs.texteDoux,
    fontSize: 13,
    flexShrink: 1,
  },
});
