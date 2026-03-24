import { router } from "expo-router";
import {
  Button,
  Input,
  ScrollView,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

export default function Config() {
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
            <Button
              size="$2"
              theme="dark_yellow"
              onPress={() => router.push("/config_edit")}
            >
              Edit
            </Button>
          </XStack>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/* Scrollview content */}
        <ScrollView width="100%" backgroundColor="">
          <YStack gap="$2">
            <Text fontSize="$3" color="white">
              Password
            </Text>
            <Input
              theme="black"
              width={"100%"}
              size="$2"
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
