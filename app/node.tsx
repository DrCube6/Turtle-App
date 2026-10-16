import { router, useLocalSearchParams } from "expo-router";
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";

import { BatteryIcon } from "@/components/BatteryIcon";
import { HistoryChart } from "@/components/HistoryChart";
import { useBLE } from "@/context/BLEContext";
import { useOpenScreen } from "@/hooks/useOpenScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

export default function Node() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  // Main screens open like tabs - no duplicate copies piling up
  const openScreen = useOpenScreen();

  //get params
  const { node, battery, temperature, humidity } = useLocalSearchParams();
  const { sensorData } = useBLE();

  console.log("selected Node: ", node);

  const nodeNum = Number(node);

  // All HR readings (1 = most recent, up to 24 = oldest) for this node,
  // sorted oldest -> newest so the chart reads left-to-right as a timeline
  const nodeHistory = sensorData
    .filter(row =>
      row.node === nodeNum &&
      row.hr >= 1 && row.hr <= 24 &&
      // react-native-chart-kit crashes on NaN, so drop malformed CSV rows
      Number.isFinite(row.temperature) &&
      Number.isFinite(row.humidity)
    )
    .sort((a, b) => b.hr - a.hr);

  const hasHistory = nodeHistory.length > 0;

  const hoursSeries = nodeHistory.map(row => row.hr);
  const temperatureSeries = nodeHistory.map(row => row.temperature);
  const humiditySeries = nodeHistory.map(row => row.humidity);

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
            <XStack justify="space-between" width="100%">
              <Text color={colors.text} fontSize="$5" fontWeight="bold">
                Node {node}
              </Text>
              <XStack gap={6} items="center">
                <Text color={colors.text} fontSize="$5" fontWeight="bold">
                  {battery}%
                </Text>
                <BatteryIcon percent={Number(battery)} size={24} />
              </XStack>
            </XStack>
            <Separator
              borderColor={colors.subtle}
              borderBottomWidth={3}
              alignSelf="stretch"
              rounded="$2"
            />
          </YStack>

          {/* Scrollview content - latest values, then the two history graphs */}
          <ScrollView width="100%">
            <YStack gap="$4" paddingBottom={20}>

              {/* Latest values */}
              <YStack
                borderWidth={2}
                borderColor={colors.subtle}
                padding={15}
                rounded={10}
              >
                <XStack justify="space-between">
                  <Text color={colors.text} fontSize="$4">
                    Temperature
                  </Text>
                  <Text color={colors.text} fontSize="$4">
                    {temperature}F
                  </Text>
                </XStack>
              </YStack>

              <YStack
                borderWidth={2}
                borderColor={colors.subtle}
                padding={15}
                rounded={10}
              >
                <XStack justify="space-between">
                  <Text color={colors.text} fontSize="$4">
                    Humidity
                  </Text>
                  <Text color={colors.text} fontSize="$4">
                    {humidity}%
                  </Text>
                </XStack>
              </YStack>

              {/* Temperature graph */}
              <YStack gap="$2">
                <Text color={colors.text} fontSize="$4" fontWeight="bold">
                  Temperature (last 24h)
                </Text>
                {hasHistory ? (
                  <HistoryChart
                    testID="temperature-chart"
                    values={temperatureSeries}
                    hours={hoursSeries}
                    unit="F"
                  />
                ) : (
                  <Text color={colors.muted} fontSize="$3">
                    No history data yet
                  </Text>
                )}
              </YStack>

              {/* Humidity graph */}
              <YStack gap="$2">
                <Text color={colors.text} fontSize="$4" fontWeight="bold">
                  Humidity (last 24h)
                </Text>
                {hasHistory ? (
                  <HistoryChart
                    testID="humidity-chart"
                    values={humiditySeries}
                    hours={hoursSeries}
                    unit="%"
                  />
                ) : (
                  <Text color={colors.muted} fontSize="$3">
                    No history data yet
                  </Text>
                )}
              </YStack>

            </YStack>
          </ScrollView>
        </YStack>
        {/* Bottom Buttons - Dash stays highlighted (node is part of the
            dashboard) but dimmed, and is still pressable to go back */}
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
                opacity={0.6}
                // Return to the existing dashboard instead of pushing a new
                // one, which would re-run the BLE sync on mount
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