import { useHabitats } from "@/context/HabitatContext";
import { useLocalSearchParams } from "expo-router";
import { Text, YStack } from "tamagui";

export default function HabitatView() {
  //get habitat info
  const params = useLocalSearchParams();
  const { habitats } = useHabitats();
  const id = Array.isArray(params.id) ? params.id[0] : params.id; // Handle the case where id might be an array

  const habitat = habitats.find((h) => h.id === id);

  //if the habitat doesn't exist, show error message
  if (!habitat) {
    return (
      <YStack items="center" justify="center" flex={1}>
        <Text>Habitat not found</Text>
      </YStack>
    );
  }

  return (
    <YStack items="center" justify="center" flex={1}>
      <Text>Habitat View</Text>
      <Text>Habitat: {habitat.name}</Text>
      <Text>Connection Address: {habitat.connection}</Text>
    </YStack>
  );
}
