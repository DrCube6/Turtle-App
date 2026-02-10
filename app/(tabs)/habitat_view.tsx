import { StyleSheet, Text, View } from "react-native";

export default function HabitatView() {
  return (
    <View
      style={styles.container}>
      <Text style={styles.text}>Habitat View Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8a8383",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
  }
});
