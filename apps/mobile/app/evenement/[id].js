import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getEvenements } from "@senevent/shared";
import { couleurs, rayons, espaces, infosCategorie } from "../../theme";
import { dateLisible, heure, formaterPrix } from "../../format";

// Sous l'affiche, le degrade se fond cette fois dans le fond de l'ecran.
const VOILE = ["rgba(11, 22, 34, 0)", "rgba(11, 22, 34, 0.45)", couleurs.fond];

// Navigation par code, en plus de la fleche automatique du Stack.
// router.push("/") empilerait une seconde copie des onglets par-dessus le
// detail (depuis Expo Router v4, push pousse toujours un nouvel ecran).
// dismissTo depile jusqu'a la liste, ou la met a la place du detail si on est
// arrive par un lien direct.
function BoutonRetourListe() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.dismissTo("/")}
      style={({ pressed }) => [styles.bouton, pressed && styles.boutonEnfonce]}
    >
      <Ionicons name="list" size={16} color={couleurs.fond} />
      <Text style={styles.boutonTexte}>Retour a la liste</Text>
    </Pressable>
  );
}

export default function Detail() {
  // La valeur qui a pris la place de [id] dans le chemin. Comme useParams au
  // Lab 4, c'est toujours une chaine : "/evenement/3" donne id === "3".
  const { id } = useLocalSearchParams();
  const [evenement, setEvenement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [imageCassee, setImageCassee] = useState(false);

  useEffect(() => {
    // L'ecran ne recoit pas la liste de l'onglet Evenements : il rappelle la
    // fonction partagee et cherche l'id. Aucune requete Supabase ecrite ici.
    const charger = async () => {
      try {
        const tous = await getEvenements();
        setEvenement(tous.find((ev) => ev.id === Number(id)) ?? null);
      } catch (e) {
        setErreur(e.message);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [id]);

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={couleurs.accent} />
      </View>
    );
  }

  if (erreur || !evenement) {
    return (
      <View style={styles.centre}>
        <View style={styles.pastilleEtat}>
          <Ionicons
            name={erreur ? "cloud-offline-outline" : "search-outline"}
            size={30}
            color={erreur ? couleurs.erreur : couleurs.texteDoux}
          />
        </View>
        <Text style={styles.titreEtat}>
          {erreur ? "Chargement impossible" : "Evenement introuvable."}
        </Text>
        <Text style={styles.detailEtat}>
          {erreur ?? `Aucun evenement ne porte l'identifiant ${id}.`}
        </Text>
        <BoutonRetourListe />
      </View>
    );
  }

  const categorie = infosCategorie(evenement.categorie);
  const afficherImage = evenement.image_url && !imageCassee;

  const infos = [
    { icone: "calendar-outline", label: "Date", valeur: dateLisible(evenement.date_debut) },
    { icone: "time-outline", label: "Heure", valeur: heure(evenement.date_debut) },
    { icone: "location-outline", label: "Lieu", valeur: evenement.lieu_nom },
  ];
  // getEvenements() joint le profil de l'organisateur : on l'affiche s'il existe.
  if (evenement.profiles?.nom) {
    infos.push({
      icone: "person-outline",
      label: "Organisateur",
      valeur: evenement.profiles.nom,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.defilement}>
      <View style={styles.zoneAffiche}>
        {afficherImage ? (
          <Image
            source={{ uri: evenement.image_url }}
            style={styles.affiche}
            resizeMode="cover"
            onError={() => setImageCassee(true)}
          />
        ) : (
          <View style={[styles.affiche, { backgroundColor: categorie.couleur }]}>
            <Ionicons name={categorie.icone} size={64} color="rgba(255, 255, 255, 0.35)" />
          </View>
        )}
        <LinearGradient
          colors={VOILE}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <View style={styles.contenu}>
        <View style={[styles.badge, { backgroundColor: categorie.couleur }]}>
          <Ionicons name={categorie.icone} size={12} color="#fff" />
          <Text style={styles.badgeTexte}>{evenement.categorie}</Text>
        </View>

        <Text style={styles.titre}>{evenement.titre}</Text>

        <View style={styles.bloc}>
          {infos.map((info, i) => (
            <View
              key={info.label}
              style={[styles.ligne, i === infos.length - 1 && styles.derniereLigne]}
            >
              <View style={styles.icone}>
                <Ionicons name={info.icone} size={16} color={couleurs.accentClair} />
              </View>
              <Text style={styles.label}>{info.label}</Text>
              <Text style={styles.valeur} numberOfLines={2}>
                {info.valeur}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.blocPrix}>
          <Text style={styles.label}>Prix d'entree</Text>
          <Text style={styles.prix}>{formaterPrix(evenement.prix)}</Text>
        </View>

        <BoutonRetourListe />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  defilement: {
    paddingBottom: espaces.xl,
  },
  zoneAffiche: {
    height: 260,
    backgroundColor: couleurs.carte,
  },
  affiche: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  contenu: {
    paddingHorizontal: espaces.l,
    marginTop: -espaces.xl,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rayons.pilule,
    overflow: "hidden",
  },
  badgeTexte: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  titre: {
    color: couleurs.texte,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: espaces.m,
    letterSpacing: -0.3,
  },
  bloc: {
    marginTop: espaces.xl,
    backgroundColor: couleurs.carte,
    borderRadius: rayons.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingHorizontal: espaces.l,
  },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.m,
    paddingVertical: espaces.m,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  derniereLigne: {
    borderBottomWidth: 0,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: rayons.s,
    backgroundColor: couleurs.voile,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: couleurs.texteDoux,
    fontSize: 13,
  },
  valeur: {
    flex: 1,
    textAlign: "right",
    color: couleurs.texte,
    fontSize: 14,
    fontWeight: "600",
  },
  blocPrix: {
    marginTop: espaces.l,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.l,
    borderRadius: rayons.l,
    backgroundColor: "rgba(234, 125, 43, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(234, 125, 43, 0.35)",
  },
  prix: {
    color: couleurs.accentClair,
    fontSize: 20,
    fontWeight: "800",
  },
  bouton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: espaces.xl,
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.m,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.accent,
  },
  boutonEnfonce: {
    opacity: 0.75,
  },
  boutonTexte: {
    color: couleurs.fond,
    fontWeight: "800",
    fontSize: 14,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espaces.xl,
    backgroundColor: couleurs.fond,
  },
  pastilleEtat: {
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
});
