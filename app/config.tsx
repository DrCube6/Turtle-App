import { router } from "expo-router";
import { Platform } from "react-native";
import {
  Button,
  Input,
  ScrollView,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { useBLE } from "@/context/BLEContext";
import { useLogin } from "@/hooks/useLogin";

export default function Config() {
  const { disconnect } = useBLE();
  const { logout } = useLogin();

  //handle logout
  const handleLogout = async () => {
    // Await so the saved login is gone before /login mounts and re-reads it
    await logout();
    await disconnect();
    // Clear the stack so Android's back button can't return into the app
    router.dismissAll();
    router.replace("/login");
  };

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
        {/* Top Header */}
        <YStack gap={10} width="100%">
          <XStack justify="space-between">
            <Text color="white" fontSize="$5" fontWeight="bold">
              Configure
            </Text>
            <XStack gap={10}>
              <Button size="$2" theme="dark_red" onPress={handleLogout}>
                Log Out
              </Button>
              <Button
                size="$2"
                theme="dark_yellow"
                // No standalone edit screen exists - init is the config form
                onPress={() => router.push("/init")}
              >
                Edit
              </Button>
            </XStack>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/* Scrollview content */}
        <ScrollView width="100%" backgroundColor="transparent">
          <YStack gap="$2">
            <Text fontSize="$3" color="white">
              Password
            </Text>
            <Input
              theme="dark_gray"
              width={"100%"}
              size="$4"
              placeholder="Enter Password"
            />
          </YStack>
        </ScrollView>
        {/* Bottom Buttons */}
        <YStack width="100%" justify="flex-end" flex={1}>
          <YStack gap={10} paddingBottom={10}>
            <XStack
              borderWidth={2}
              justify="space-evenly"
              borderColor={"white"}
              padding={10}
              rounded={20}
              width="100%"
              gap={5}
            >
              <Button
                size="$3"
                theme="dark_gray"
                onPress={() => router.push("/dashboard")}
              >
                Dash
              </Button>
              <Separator
                vertical
                borderColor="gray"
                rounded={3}
                borderBottomWidth={3}
                alignSelf="stretch"
              />
              <Button
                size="$3"
                theme="dark_gray"
                onPress={() => router.push("/map")}
              >
                Map
              </Button>
              <Separator
                vertical
                borderColor="gray"
                rounded={3}
                borderBottomWidth={3}
                alignSelf="stretch"
              />
              <Button
                size="$3"
                theme="dark_blue"
                disabled={true}
                disabledStyle={{ opacity: 0.5 }}
              >
                Config
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
