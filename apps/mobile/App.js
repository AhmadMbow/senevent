import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>SénEvent Mobile</Text>
      <Text style={styles.sousTitre}>Événements à Dakar</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  titre: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a3a5c",
  },
  sousTitre: {
    fontSize: 16,
    color: "#ea7d2b",
    marginTop: 8,
  },
});
