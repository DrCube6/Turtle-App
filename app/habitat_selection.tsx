import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";

const data = {
  habitats: [
    {
      id: 1,
      name: "habitat_01",
      connection: "0001",
    },
    {
      id: 2,
      name: "habitat_02",
      connection: "0002",
    },
  ],
};

export default function HabitatSelection() {
  //router
  const router = useRouter();

  //state for habitat name and connection address
  const [habitatName, setHabitatName] = useState("");
  const [connectionAddress, setConnectionAddress] = useState("");

  //habitats state to store the list of habitats
  const [habitats, setHabitats] = useState(data.habitats);

  //save button is enabled only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid =
    habitatName.trim() !== "" &&
    connectionAddress.trim() !== "" &&
    !habitats.some((h) => {
      return (
        h.name.toLowerCase() === habitatName.trim().toLowerCase() ||
        h.connection.toLowerCase() === connectionAddress.trim().toLowerCase()
      );
    });

  return (
    <YStack
      flex={1}
      backgroundColor="gray"
      items={"center"}
      padding="$4"
      paddingTop={60}
      gap="$4"
      width={"100%"}
    >
      <Text color="black" fontSize="$6" fontWeight="bold">
        {" "}
        Habitat Selection
      </Text>
      <Separator
        borderColor="black"
        borderBottomWidth={3}
        alignSelf="stretch"
      />
      <YStack
        flex={1}
        backgroundColor="white"
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        <XStack flexWrap="wrap" justify={"space-between"} width="100%">
          <Text color="black" fontSize="$4" fontWeight="bold">
            My Habitats
          </Text>
          <Button
            size="$2"
            theme="black_accent"
            onPress={() => {
              router.push("/create_new_habitat");
            }}
          >
            Add
          </Button>
        </XStack>
        <Separator
          borderColor="black_accent"
          borderBottomWidth={3}
          alignSelf="stretch"
        />
        <ScrollView width="100%" rounded={10}>
          <YStack gap="$3" width="100%">
            {habitats.map((habitat) => (
              <Button
                key={habitat.id}
                justify={"flex-start"}
                padding="$3"
                size="$6"
                backgroundColor="$blue3"
                hoverStyle={{
                  background: "$blue4",
                }}
                onPress={() => {
                  //navigate to habitat view
                  router.push("/(tabs)/habitat_view");
                }}
                rounded={10}
              >
                <YStack gap="$1">
                  <Text color="black" fontSize="$4" fontWeight="bold">
                    {habitat.name}
                  </Text>
                  <Text color="black">{habitat.connection}</Text>
                </YStack>
              </Button>
            ))}
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
