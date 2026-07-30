import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, Easing } from "react-native";
import { couleurs, rayons, espaces } from "../theme";

// Carte fantome affichee pendant le chargement. Une silhouette qui pulse
// donne une meilleure impression de vitesse qu'un simple spinner : l'ecran
// montre tout de suite la forme du contenu a venir.
export default function CarteSquelette() {
  const pulsation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsation, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulsation, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [pulsation]);

  const opacite = pulsation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View style={[styles.carte, { opacity: opacite }]}>
      <View style={styles.affiche} />
      <View style={styles.contenu}>
        <View style={[styles.barre, { width: "35%", height: 14 }]} />
        <View style={[styles.barre, { width: "85%", height: 18 }]} />
        <View style={[styles.barre, { width: "55%", height: 12 }]} />
      </View>
    </Animated.View>
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
  },
  affiche: {
    height: 190,
    backgroundColor: couleurs.voile,
  },
  contenu: {
    padding: espaces.l,
    gap: espaces.s,
  },
  barre: {
    backgroundColor: couleurs.voile,
    borderRadius: rayons.s,
  },
});
