import { useHabitats } from "@/context/HabitatContext";
import { router } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";

export default function Login() {
  //router
  const { habitats, addHabitat } = useHabitats();

  //form states
  const [habitatName, setHabitatName] = useState("");
  const [connectionAddress, setConnectionAddress] = useState("");

  //handle save
  const handleSave = () => {
    //Add all habitat values
    addHabitat({
      name: habitatName.trim(),
      connection: connectionAddress.trim(),
      rows: 0,
      cols: 0,
      sensors: [],
    });
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
      paddingTop={Platform.OS === "android" ? 30 : 60}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor="$gray12"
        borderWidth={2}
        borderColor={"white"}
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        paddingBottom={10}
        rounded={40}
      >
        <YStack
          backgroundColor="transparent"
          //flex={1}
          width="100%"
          items="center"
          gap="$4"
          //padding="$5"
        >
          <Text color="white" fontSize="$5" fontWeight="bold">
            Habitat Login
          </Text>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/*form feilds*/}
        <YStack gap="$2" width="100%">
          <Text fontSize="$3" color="white">
            Habitat Name
          </Text>
          <Input
            theme="dark_gray"
            width={"100%"}
            size="$4"
            placeholder="Enter Habitat Name"
            value={habitatName}
            onChangeText={setHabitatName}
          />
          <Text fontSize="$3" color="white">
            Password
          </Text>
          <Input
            theme="dark_gray"
            width={"100%"}
            size="$4"
            placeholder="Enter Password"
            value={connectionAddress}
            onChangeText={setConnectionAddress}
          />
        </YStack>
        {/* Bottom Buttons */}
        <YStack
          width="100%"
          backgroundColor="transparent"
          justify="flex-end"
          paddingBottom={10}
          flex={1}
          gap={10}
        >
          <XStack
            justify="flex-end"
            padding={10}
            rounded={20}
            borderWidth={2}
            borderColor={"white"}
            width="100%"
            gap={10}
          >
            <Separator
              vertical
              borderColor="gray"
              rounded={3}
              borderBottomWidth={3}
              alignSelf="stretch"
            />
            <Button
              size="$3"
              theme="dark_green"
              disabled={!ifFormValid}
              disabledStyle={{ opacity: 0.5 }}
              onPress={() => {
                handleSave();
                router.push("/hub_connect");
              }}
            >
              Confirm
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
