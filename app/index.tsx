import { Link } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

const data = {
  habitats: [
    {
      id: 1,
      name: "Tropical Rainforest",
      description: "A dense, warm, and wet forest with a high level of biodiversity.",
      imageUrl: "https://example.com/tropical-rainforest.jpg"
    },
    {
      id: 2,
      name: "Savanna",
      description: "A grassy plain with scattered trees, found in tropical and subtropical regions.",
      imageUrl: "https://example.com/savanna.jpg"
    }
  ]
}

export default function Index() {

  const [habitats, setHabitats] = useState(data.habitats);

  

  return (
    <View
      style={styles.container}
    >

      <Text style={styles.text}>Hello</Text>
      <Button title="Add Habitat" onPress={() => {
        setHabitats((prev) => [
          ...prev,
          {
            id: data.habitats.length + 1,
            name: "New Habitat",
            description: "A newly added habitat.",
            imageUrl: "https://example.com/new-habitat.jpg"
          }
        ])
      }} />

      <Link href={"/(tabs)/habitat_view"} style={styles.button}>
        Go to Habitat View
      </Link>

      {habitats.map((habitat) => (
        <View key={habitat.id} style={styles.habitatCard}>
          <Text style={styles.text}>
            {habitat.name}
          </Text>
          <Text style={styles.text}>
            {habitat.description}
          </Text>
        </View>
      ))}


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
  },
  habitatCard: {
    marginVertical: 10,
    padding: 10,
  },
  button: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
  }
});
