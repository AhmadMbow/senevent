import { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { getEvenements } from "@senevent/shared";
import EnteteAccueil from "../../components/EnteteAccueil";
import BoutonAjouter from "../../components/BoutonAjouter";
import FiltreCategories from "../../components/FiltreCategories";
import EvenementCarte from "../../components/EvenementCarte";
import CarteSquelette from "../../components/CarteSquelette";
import { couleurs, rayons, espaces } from "../../theme";

// Onglet "Evenements" : la logique de l'ancien App.js, deplacee telle quelle.
// L'init Supabase est montee dans app/_layout.js, et la zone sure est geree
// par le navigateur (barre d'onglets en bas, EnteteAccueil en haut).
export default function Evenements() {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [categorieActive, setCategorieActive] = useState(null);

  // Une seule fonction de chargement, reutilisee a chaque focus, au
  // pull-to-refresh et par le bouton "Reessayer" de l'ecran d'erreur.
  const charger = useCallback(async () => {
    try {
      const data = await getEvenements();
      setEvenements(data);
      setErreur(null);
    } catch (e) {
      setErreur(e.message);
    }
  }, []);

  // Un onglet n'est pas demonte quand on le quitte : un useEffect(fn, [])
  // ne repasserait pas au retour de l'ecran de creation. useFocusEffect
  // relance le chargement chaque fois que la liste redevient visible.
  // Les squelettes ne s'affichent qu'au premier chargement, les suivants
  // remplacent la liste sans la vider.
  useFocusEffect(
    useCallback(() => {
      charger().finally(() => setChargement(false));
    }, [charger])
  );

  const rafraichir = useCallback(async () => {
    setRafraichissement(true);
    await charger();
    setRafraichissement(false);
  }, [charger]);

  const reessayer = useCallback(async () => {
    setChargement(true);
    await charger();
    setChargement(false);
  }, [charger]);

  // Nombre d'evenements par categorie, pour les pastilles des filtres.
  const compteurs = useMemo(() => {
    const total = { total: evenements.length };
    for (const ev of evenements) {
      total[ev.categorie] = (total[ev.categorie] ?? 0) + 1;
    }
    return total;
  }, [evenements]);

  // Le filtrage se fait sur la liste deja chargee : pas de nouvelle requete.
  const visibles = useMemo(
    () =>
      categorieActive
        ? evenements.filter((ev) => ev.categorie === categorieActive)
        : evenements,
    [evenements, categorieActive]
  );

  return (
    <View style={styles.ecran}>
      <EnteteAccueil
        nombre={evenements.length}
        chargement={chargement}
        action={<BoutonAjouter />}
      />

      {!erreur && (
        <FiltreCategories
          actif={categorieActive}
          onChange={setCategorieActive}
          compteurs={compteurs}
        />
      )}

      {chargement && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <CarteSquelette />
          <CarteSquelette />
          <CarteSquelette />
        </ScrollView>
      )}

      {!chargement && erreur && (
        <View style={styles.centre}>
          <View style={styles.pastilleEtat}>
            <Ionicons name="cloud-offline-outline" size={30} color={couleurs.erreur} />
          </View>
          <Text style={styles.titreEtat}>Chargement impossible</Text>
          <Text style={styles.detailEtat}>{erreur}</Text>
          <Pressable
            onPress={reessayer}
            style={({ pressed }) => [styles.bouton, pressed && styles.boutonEnfonce]}
          >
            <Ionicons name="refresh" size={16} color={couleurs.fond} />
            <Text style={styles.boutonTexte}>Reessayer</Text>
          </Pressable>
        </View>
      )}

      {!chargement && !erreur && (
        <FlatList
          data={visibles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <EvenementCarte evenement={item} />}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={rafraichissement}
              onRefresh={rafraichir}
              tintColor={couleurs.accent}
              colors={[couleurs.accent]}
              progressBackgroundColor={couleurs.carte}
            />
          }
          ListEmptyComponent={
            <View style={styles.centre}>
              <View style={styles.pastilleEtat}>
                <Ionicons name="calendar-outline" size={30} color={couleurs.texteDoux} />
              </View>
              <Text style={styles.titreEtat}>Aucun evenement</Text>
              <Text style={styles.detailEtat}>
                {categorieActive
                  ? "Rien dans cette categorie pour le moment."
                  : "Tirez vers le bas pour rafraichir."}
              </Text>
            </View>
          }
          ListFooterComponent={
            visibles.length > 0 ? (
              <Text style={styles.pied}>Realise par Papa Ahmadou Mbow</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  liste: {
    paddingBottom: espaces.xl,
    flexGrow: 1,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espaces.xl,
    paddingBottom: 60,
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
  bouton: {
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
  pied: {
    textAlign: "center",
    color: couleurs.texteFaible,
    fontSize: 12,
    marginTop: espaces.s,
  },
});
