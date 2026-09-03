import { router } from "expo-router";
import { Platform } from "react-native";
// import { useBLE } from "../hooks/useBLE";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";

export default function Dashboard() {
  // const { connectedDevice } = useBLE();

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
        <YStack gap={10}>
          <XStack justify="space-between" width="100%">
            <Text color="white" fontSize="$5" fontWeight="bold">
              Dashboard
            </Text>
            <Text color="white" fontSize="$5" fontWeight="bold">
              100%
            </Text>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
          {/* Static Content */}
          <YStack
            padding={15}
            borderWidth={2}
            borderColor={"gray"}
            rounded={10}
          >
            <XStack justify="space-between">
              <YStack>
                <Text color="white" fontSize="$4">
                  Last Sync: 04/18/2026
                </Text>
                <Text color="gray" fontSize="$3">
                  Status: waiting...
                </Text>
              </YStack>
              <Button
                //onPress={() => router.push("/dashboard")}
                theme="dark_red"
                size="$3"
                alignSelf="center"
              >
                Sync
              </Button>
            </XStack>
          </YStack>
          <XStack justify="space-between">
            <Text color="white" fontSize="$4">
              Hub
            </Text>
            <Text color="white" fontSize="$4">
              100%
            </Text>
          </XStack>
          <XStack justify="space-between">
            <Text color="white" fontSize="$4">
              Node Average
            </Text>
            <Text color="white" fontSize="$4">
              100%
            </Text>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={2}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/* Scrollview content */}
        <ScrollView width="100%" backgroundColor="">
          <YStack gap="$4">
            <Button theme="dark_yellow" onPress={() => router.push("/node")}>
              <XStack justify="space-between" flex={1}>
                <Text color="white" fontSize="$4">
                  Node 01
                </Text>
                <Text color="white" fontSize="$4">
                  100%
                </Text>
              </XStack>
            </Button>
            <Button theme="dark_yellow" onPress={() => router.push("/node")}>
              <XStack justify="space-between" flex={1}>
                <Text color="white" fontSize="$4">
                  Node 02
                </Text>
                <Text color="white" fontSize="$4">
                  100%
                </Text>
              </XStack>
            </Button>
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
                theme="dark_blue"
                disabled={true}
                disabledStyle={{ opacity: 0.5 }}
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
                theme="dark_gray"
                onPress={() => router.push("/config")}
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
