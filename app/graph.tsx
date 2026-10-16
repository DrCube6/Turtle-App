import { router } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

export default function Graph() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  return (
    <YStack
      flex={1}
      backgroundColor={colors.background}
      items={"center"}
      padding="$4"
      paddingTop={screenPadding.paddingTop}
      paddingBottom={screenPadding.paddingBottom}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor={colors.background}
        borderWidth={2}
        borderColor={colors.border}
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        paddingBottom={10}
        rounded={40}
      >
        <YStack flex={1} width="100%" items="center" gap="$4">
          {/* Top Header */}
          <YStack gap={10} width="100%">
            <Text color={colors.text} fontSize="$5" fontWeight="bold">
              Node 01 - Temperature
            </Text>
            <Separator
              borderColor={colors.subtle}
              borderBottomWidth={3}
              alignSelf="stretch"
              rounded="$2"
            />
          </YStack>
          {/* Scrollview content */}
          <ScrollView
            width="100%"
            borderWidth={2}
            borderColor={colors.subtle}
            rounded={10}
          ></ScrollView>
          {/* Bottom Buttons */}
          <YStack width="100%" justify="flex-end" flex={1}>
            <YStack gap={10} paddingBottom={10}>
              <XStack
                borderWidth={2}
                justify="space-evenly"
                borderColor={colors.border}
                padding={10}
                rounded={20}
                width="100%"
                gap={5}
              >
                <Button
                  size="$3"
                  theme="blue"
                  onPress={() => router.push("/dashboard")}
                >
                  Dash
                </Button>
                <Separator
                  vertical
                  borderColor={colors.subtle}
                  rounded={3}
                  borderBottomWidth={3}
                  alignSelf="stretch"
                />
                <Button
                  size="$3"
                  theme="gray"
                  onPress={() => router.push("/map")}
                >
                  Map
                </Button>
                <Separator
                  vertical
                  borderColor={colors.subtle}
                  rounded={3}
                  borderBottomWidth={3}
                  alignSelf="stretch"
                />
                <Button
                  size="$3"
                  theme="gray"
                  onPress={() => router.push("/config")}
                >
                  Config
                </Button>
              </XStack>
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
