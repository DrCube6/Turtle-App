import { useHabitats } from "@/context/HabitatContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Input, Separator, SizableText, XStack, YStack } from "tamagui";

export default function AddExistingHabitat() {
  const router = useRouter();
  const { habitats, addHabitat } = useHabitats();

  //form states
  const [habitatName, setHabitatName] = useState("");
  const [connectionAddress, setConnectionAddress] = useState("");

  //handle save
  const handleSave = () => {
    addHabitat(habitatName, connectionAddress);
    router.push("/habitat_selection");
  };

  //is form valid only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid =
    habitatName.trim() !== "" &&
    connectionAddress.trim() !== "" &&
    !habitats.some(
      (h) =>
        h.name.toLowerCase() === habitatName.trim().toLowerCase() ||
        h.connection.toLowerCase() === connectionAddress.trim().toLowerCase(),
    );

  return (
    <YStack
      flex={1}
      backgroundColor="$gray12"
      items={"center"}
      padding="$4"
      paddingTop={60}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor="$gray12"
        borderWidth={3}
        borderColor={"white"}
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        <SizableText color="white" size="$8" alignSelf={"center"}>
          {"Add Existing Habitat"}
        </SizableText>
        <Separator
          borderColor="gray"
          borderBottomWidth={3}
          alignSelf="stretch"
        />

        <SizableText size="$3" color="white">
          {"Habitat Name"}
        </SizableText>
        <Input
          theme="black"
          width={"100%"}
          size="$2"
          placeholder="Enter Habitat Name"
          value={habitatName}
          onChangeText={setHabitatName}
        />
        <SizableText size="$3" color="white">
          {"Connection Address"}
        </SizableText>
        <Input
          theme="black"
          width={"100%"}
          size="$2"
          placeholder="Enter Connection Address"
          value={connectionAddress}
          onChangeText={setConnectionAddress}
        />
        <XStack gap="$2" justify="flex-end" theme="light_gray_accent">
          <Button size="$3" onPress={() => router.back()}>
            Back
          </Button>
          <Button
            size="$3"
            theme="dark_green"
            disabled={!ifFormValid}
            disabledStyle={{ opacity: 0.5 }}
            onPress={handleSave}
          >
            Save
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
