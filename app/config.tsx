import { router } from "expo-router";
import { Alert, Switch } from "react-native";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";
import { useBLE } from "@/context/BLEContext";
import { useNodePlacements } from "@/hooks/useNodePlacements";
import { useOpenScreen } from "@/hooks/useOpenScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

// Rounded setting boxes, like the dashboard's sync box
const settingBox = {
  width: "100%",
  padding: 15,
  borderWidth: 2,
  rounded: 10,
} as const;

export default function Config() {
  const screenPadding = useScreenPadding();
  // Theme is app-wide and saved on the phone, so the switch keeps its
  // position when you leave Config and come back
  const { colors, mode, setMode } = useAppTheme();
  // Main screens open like tabs - no duplicate copies piling up
  const openScreen = useOpenScreen();
  const { disconnect } = useBLE();
  const { placements, clearPlacements } = useNodePlacements();

  const placedCount = Object.keys(placements).length;

  //handle disconnect - drop the main controller but stay logged in to the
  //cloud; go back to the hub screen to pick a hub again. Logging out of the
  //cloud only happens from the hub screen's Log Out button.
  const handleDisconnect = async () => {
    await disconnect();
    // Back to the existing hub screen, closing dashboard/config/etc. above it
    router.dismissTo("/hub_connect");
  };

  // Ask first - disconnecting drops the hub and its synced data
  const confirmDisconnect = () => {
    Alert.alert(
      "Disconnect from the main controller?",
      "You'll go back to Connect to Hub and need to scan and connect again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: () => handleDisconnect() },
      ]
    );
  };

  // Removes every node and the hub from the map - ask first, it can't be undone
  const handleResetNodes = () => {
    // The button is greyed out too, but don't rely on that alone
    if (placedCount === 0) return;
    Alert.alert(
      "Reset all map node locations?",
      "This removes every node and the hub from the map. You can place them again with a long press on the map.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => clearPlacements() },
      ]
    );
  };

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
        {/* Top Header */}
        <YStack gap={10} width="100%">
          <Text color={colors.text} fontSize="$5" fontWeight="bold">
            Configure
          </Text>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>

        {/* Settings */}
        <ScrollView width="100%" flex={1}>
          <YStack gap="$4">
            <XStack {...settingBox} borderColor={colors.subtle} justify="space-between" items="center">
              <Text color={colors.text} fontSize="$4">
                Dark theme
              </Text>
              <Switch
                testID="dark-theme-switch"
                value={mode === "dark"}
                onValueChange={(on) => setMode(on ? "dark" : "light")}
                trackColor={{ false: "#555", true: "rgb(37, 99, 235)" }}
                thumbColor="white"
              />
            </XStack>

            {/* Actions, under the theme toggle */}
            <YStack gap={10}>
              {/* Pick the map's home view on a map - what you see is what you get */}
              <Button
                testID="change-default-map-location"
                size="$3"
                theme="yellow"
                onPress={() => router.push("/pick-location")}
              >
                Change Default Map Location
              </Button>
              <Button
                testID="reset-node-locations"
                size="$3"
                theme="red"
                onPress={handleResetNodes}
                disabled={placedCount === 0}
                disabledStyle={{ opacity: 0.5 }}
              >
                Reset All Map Node Locations
              </Button>
              <Button
                testID="disconnect"
                size="$3"
                theme="red"
                onPress={confirmDisconnect}
              >
                Disconnect
              </Button>
            </YStack>
          </YStack>
        </ScrollView>

        {/* Bottom: nav bar */}
        <YStack width="100%" paddingBottom={10}>
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
              theme="gray"
              // Back to the existing dashboard (instant, no re-sync)
              onPress={() => router.dismissTo("/dashboard")}
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
              onPress={() => openScreen("/map")}
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
              theme="blue"
              disabled={true}
              disabledStyle={{ opacity: 0.5 }}
            >
              Config
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
