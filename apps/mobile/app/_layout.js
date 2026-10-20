import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initSupabase } from "@senevent/shared";
import { couleurs } from "../theme";

// Initialiser Supabase une fois, au demarrage de l'app.
// C'etait le role de l'ancien App.js : avec Expo Router, le layout racine est
// le premier fichier execute, avant n'importe quel ecran.
initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Ouvert directement par un lien profond (senevent://evenement/3), le detail
// garde les onglets en dessous de lui : la fleche retour ramene a la liste
// au lieu de fermer l'app.
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: couleurs.fondEntete },
          headerTintColor: couleurs.texte,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          headerBackTitle: "Retour",
          // Fond sombre pendant les transitions : sans lui, React Navigation
          // affiche son fond clair par defaut le temps de l'animation.
          contentStyle: { backgroundColor: couleurs.fond },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="evenement/[id]" options={{ title: "Detail" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
