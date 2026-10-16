import { useEffect } from "react";
import { Text, Button, YStack, Separator, XStack, ScrollView } from "tamagui";
import { BatteryIcon } from "@/components/BatteryIcon";
import { SyncProgress } from "@/components/SyncProgress";
import { useBLE } from "@/context/BLEContext";
import { useNow } from "@/hooks/useNow";
import { formatSyncedAgo } from "@/utils/time";
import { useOpenScreen } from "@/hooks/useOpenScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { Alert, RefreshControl } from "react-native";

export default function Dashboard() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  // Main screens open like tabs - no duplicate copies piling up
  const openScreen = useOpenScreen();
  const {
    connectedDevice,
    requestCSV,
    requestCSVAndWait,
    disconnect,
    sensorData,
    isTransferring,
    transferProgress,
    lastSyncedAt,
    csvType,
  } = useBLE();

  // Only the most recent reading per node (HR === 1)
  // Ticks so "Synced 5 min ago" stays current while the screen is open
  const now = useNow();

  const latestNodes = sensorData.filter((row) => row.hr === 1);

  // Hub (node 0) battery, most recent reading only
  const hubBattery = latestNodes.find((row) => row.node === 0)?.battery;

  // Field nodes 1-12, most recent reading only - used for the list and the average
  const latestFieldNodes = latestNodes.filter(
    (row) => row.node >= 1 && row.node <= 12,
  );

  const averageNodeBattery =
    latestFieldNodes.length > 0
      ? latestFieldNodes.reduce((acc, row) => acc + row.battery, 0) /
        latestFieldNodes.length
      : 0;

  //start monitoring
  useEffect(() => {
    if (!connectedDevice) {
      console.log("Dashboard: no device");
      return;
    }

    console.log("Dashboard connected to:", connectedDevice.name);

    // Only sync automatically when there's nothing to show yet (fresh
    // connection). With data already loaded, opening the dashboard is
    // instant - the Sync button / pull-down fetch newer data on demand.
    if (sensorData.length > 0) {
      console.log("Dashboard opened — data already loaded, not syncing");
      return;
    }

    //kick off the chunked CSV transfer as soon as we're connected
    console.log("Dashboard opened — requesting CSV");

    // Nothing to show if this fails, so don't sit on an empty dashboard:
    // drop the connection and go back to pick a hub again.
    (async () => {
      const result = await requestCSVAndWait({ quiet: true });
      // "disconnected": the hub dropped mid-sync - ConnectionLostRedirect
      // already sends the user to the hub screen with a message
      if (result !== "failed" && result !== "unrecognised") {
        return;
      }

      console.log(`Dashboard: no usable data on connect (${result}), disconnecting`);
      await disconnect();
      router.dismissTo("/hub_connect");
      Alert.alert(
        "No data from hub",
        result === "failed"
          ? "The hub connected but did not send any data. It has been disconnected - try connecting again."
          : "The hub sent data the app does not recognise. It has been disconnected - try connecting again."
      );
    })();
    // Only re-run on a new connection - the BLE functions are recreated every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedDevice]);

  // Once a transfer finishes, check what kind of CSV came back.
  // If it's the ESP32's initial/unconfigured CSV, send the user to
  // the config screen instead of showing (stale/empty) dashboard data.
  // Only while focused: when /init is open on top (Config > Edit), the
  // init screen handles the hub's answer itself and must not be replaced.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused && csvType === "config") {
      console.log("Dashboard: initial config CSV detected, routing to /init");
      router.replace("/init");
    }
  }, [csvType, isFocused]);

  // Avoid flashing an empty/stale dashboard while a transfer is in
  // progress or right before the redirect above kicks in.
  if (isTransferring || csvType === "config") {
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
          width="100%"
          gap="$4"
          padding="$5"
          paddingTop={30}
          paddingBottom={10}
          rounded={40}
          items="center"
          justify="center"
        >
          {isTransferring ? (
            <SyncProgress {...transferProgress} />
          ) : (
            <Text color={colors.text} fontSize="$5">
              Redirecting...
            </Text>
          )}
        </YStack>
      </YStack>
    );
  }

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
        <YStack gap={10}>
          <XStack justify="space-between" width="100%">
            <Text color={colors.text} fontSize="$5" fontWeight="bold">
              Dashboard
            </Text>
            <XStack gap={6} items="center">
              <Text color={colors.text} fontSize="$5" fontWeight="bold">
                {hubBattery?.toFixed(2)}%
              </Text>
              <BatteryIcon percent={hubBattery} size={24} />
            </XStack>
          </XStack>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
          {/* Static Content */}
          <YStack
            padding={15}
            borderWidth={2}
            borderColor={colors.subtle}
            rounded={10}
          >
            <XStack justify="space-between" items="center">
              {/* Updates on its own: "just now" -> "1 min ago" -> ... */}
              <Text testID="synced-ago" color={colors.text} fontSize="$4">
                {formatSyncedAgo(lastSyncedAt, now)}
              </Text>
              <Button
                onPress={() => requestCSV()}
                disabled={isTransferring}
                disabledStyle={{ opacity: 0.5 }}
                theme="red"
                size="$3"
                alignSelf="center"
              >
                {isTransferring ? "Syncing..." : "Sync"}
              </Button>
            </XStack>
          </YStack>
          <XStack justify="space-between">
            <Text color={colors.text} fontSize="$4">
              Node Average
            </Text>
            <XStack gap={6} items="center">
              <Text color={colors.text} fontSize="$4">
                {averageNodeBattery.toFixed(2)}%
              </Text>
              <BatteryIcon percent={averageNodeBattery} />
            </XStack>
          </XStack>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={2}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>
        {/* Scrollview content */}
        {/* Pull down on the node list to sync */}
        <ScrollView
          width="100%"
          flex={1}
          refreshControl={
            <RefreshControl
              refreshing={isTransferring}
              onRefresh={() => requestCSV()}
              tintColor={colors.text}
              colors={["rgb(234, 179, 8)"]}
              progressBackgroundColor={colors.background}
            />
          }
        >
          <YStack gap="$4">
            {latestFieldNodes.map((row) => (
              <Button
                key={row.node}
                theme="yellow"
                onPress={() =>
                  openScreen("/node", {
                      node: row.node.toString(),
                      battery: row.battery.toString(),
                      temperature: row.temperature.toString(),
                      humidity: row.humidity.toString(),
                    })
                }
              >
                <XStack justify="space-between" flex={1}>
                  <Text color={colors.text} fontSize="$4">
                    Node {row.node}
                  </Text>
                  <XStack gap={6} items="center">
                    <Text color={colors.text} fontSize="$4">
                      {row.battery}%
                    </Text>
                    <BatteryIcon percent={row.battery} />
                  </XStack>
                </XStack>
              </Button>
            ))}
          </YStack>
        </ScrollView>
        {/* Bottom Buttons */}
        <YStack width="100%" justify="flex-end">
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
                disabled={true}
                disabledStyle={{ opacity: 0.5 }}
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
                theme="gray"
                onPress={() => openScreen("/config")}
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
