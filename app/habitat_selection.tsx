import { useRouter } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import { useHabitats } from "../context/HabitatContext";

export default function HabitatSelection() {
  //get habitats
  const { habitats } = useHabitats();

  //router
  const router = useRouter();

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
            {habitats.length === 0 ? (
              <Text color="black" fontSize="$3">
                No habitats found. Please add a habitat.
              </Text>
            ) : (
              habitats.map((habitat) => (
                <Button
                  key={habitat.id}
                  justify={"flex-start"}
                  padding="$3"
                  size="$6"
                  rounded={10}
                  backgroundColor="$blue3"
                  hoverStyle={{
                    background: "$blue4",
                  }}
                  onPress={() => {
                    //navigate to habitat view
                    router.push({
                      pathname: "/(tabs)/habitat_view",
                      params: {
                        id: habitat.id,
                      },
                    });
                  }}
                >
                  <YStack gap="$1">
                    <Text color="black" fontSize="$4" fontWeight="bold">
                      {habitat.name}
                    </Text>
                    <Text color="black">{habitat.connection}</Text>
                  </YStack>
                </Button>
              ))
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
