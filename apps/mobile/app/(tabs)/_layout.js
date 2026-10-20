import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { couleurs } from "../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: couleurs.fondEntete },
        headerTintColor: couleurs.texte,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarActiveTintColor: couleurs.accent,
        tabBarInactiveTintColor: couleurs.texteFaible,
        tabBarStyle: {
          backgroundColor: couleurs.carte,
          borderTopColor: couleurs.bordure,
        },
        tabBarLabelStyle: { fontWeight: "600" },
        sceneStyle: { backgroundColor: couleurs.fond },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Evenements",
          // L'onglet garde son en-tete de marque du Lab 8 (degrade + compteur),
          // qui joue deja le role de barre de titre.
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
