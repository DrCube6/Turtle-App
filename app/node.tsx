import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Button, ScrollView, Separator, Spinner, Text, XStack, YStack } from "tamagui";

import { BatteryIcon } from "@/components/BatteryIcon";
import { HistoryChart } from "@/components/HistoryChart";
import { useBLE } from "@/context/BLEContext";
import { useOpenScreen } from "@/hooks/useOpenScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";
import { formatPercent, historySeries, isDisconnected, sampleCount } from "@/utils/nodes";
import { formatReadingTime } from "@/utils/time";
import { useTemperatureUnit } from "@/hooks/useTemperatureUnit";
import { formatTemperature, toUnit } from "@/utils/temperature";

// Show the screen anyway after this long, even if a graph never reports.
// Mutable so tests can shorten it.
export const NODE_LOADING = { fallbackMs: 3000 };

export default function Node() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  // Hub sends Celsius; shown in the unit chosen in Config
  const { unit } = useTemperatureUnit();
  // Main screens open like tabs - no duplicate copies piling up
  const openScreen = useOpenScreen();

  //get params
  const { node, battery, temperature, humidity } = useLocalSearchParams();
  const { sensorData } = useBLE();

  console.log("selected Node: ", node);

  const nodeNum = Number(node);

  // Has readings in the last 24 samples but none in the newest one
  const disconnected = isDisconnected(sensorData, nodeNum);

  // When this node's newest reading was taken (lowest HR that has one)
  const latestTimestamp =
    sensorData
      .filter(row => row.node === nodeNum && row.timestamp !== null)
      .sort((a, b) => a.hr - b.hr)[0]?.timestamp ?? null;

  // The graphs cover every sample in the CSV: "last 8 samples" / "last 1 sample"
  const samples = sampleCount(sensorData);
  const samplesLabel = `last ${samples} ${samples === 1 ? "sample" : "samples"}`;

  // Oldest -> newest, across those samples; hours this node has no value
  // are null (drawn as gaps, see HistoryChart)
  const temperatureHistory = historySeries(sensorData, nodeNum, row =>
    Number(toUnit(row.temperature, unit).toFixed(2))
  );
  const humidityHistory = historySeries(sensorData, nodeNum, row => row.humidity);

  // Loading stages: nothing mounted -> content built hidden -> revealed.
  // Restarts when the screen is reused for a different node.
  const [mounted, setMounted] = useState(false);
  const [chartsDrawn, setChartsDrawn] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  // Only graphs that have data are drawn (and report back)
  const chartsNeeded =
    (temperatureHistory.values.length > 0 ? 1 : 0) +
    (humidityHistory.values.length > 0 ? 1 : 0);
  const ready = mounted && (chartsDrawn >= chartsNeeded || timedOut);

  const markChartDrawn = useCallback(() => setChartsDrawn((n) => n + 1), []);

  useEffect(() => {
    setMounted(false);
    setChartsDrawn(0);
    setTimedOut(false);

    // Let the spinner screen paint first (two frames), then build the
    // heavy content
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setMounted(true));
    });
    // Never spin forever if a graph doesn't report back
    const fallback = setTimeout(() => setTimedOut(true), NODE_LOADING.fallbackMs);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      clearTimeout(fallback);
    };
  }, [node]);

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
        {/* Content area: a spinner shows straight away (cheap, so the
            screen appears instantly); the content and graphs are built
            hidden behind it and revealed once both graphs have drawn */}
        <YStack flex={1} width="100%">
          {mounted && (
        <YStack
          testID="node-content"
          flex={1}
          width="100%"
          items="center"
          gap="$4"
          opacity={ready ? 1 : 0}
        >
          {/* Top Header */}
          <YStack gap={10} width="100%">
            <XStack justify="space-between" width="100%">
              <Text color={colors.text} fontSize="$5" fontWeight="bold">
                Node {node}
              </Text>
              {disconnected ? (
                <Text testID="node-disconnected" color={colors.text} fontSize="$5" fontWeight="bold">
                  Disconnected
                </Text>
              ) : (
                <XStack gap={6} items="center">
                  <Text color={colors.text} fontSize="$5" fontWeight="bold">
                    {formatPercent(Number(battery))}
                  </Text>
                  <BatteryIcon percent={Number(battery)} size={24} />
                </XStack>
              )}
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

              {/* Latest values: when, then the readings */}
              <YStack
                borderWidth={2}
                borderColor={colors.subtle}
                padding={15}
                rounded={10}
              >
                <XStack justify="space-between">
                  <Text color={colors.text} fontSize="$4">
                    Time
                  </Text>
                  <Text testID="node-latest-time" color={colors.text} fontSize="$4">
                    {latestTimestamp ? formatReadingTime(latestTimestamp) : "--"}
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
                    Temperature
                  </Text>
                  <Text color={colors.text} fontSize="$4">
                    {formatTemperature(Number(temperature), unit)}
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
                    {formatPercent(Number(humidity))}
                  </Text>
                </XStack>
              </YStack>

              {/* Divides the latest values from the history graphs */}
              <Separator
                testID="node-values-separator"
                borderColor={colors.subtle}
                borderBottomWidth={2}
                alignSelf="stretch"
                rounded="$2"
              />

              {/* Temperature graph */}
              <YStack gap="$2">
                <Text color={colors.text} fontSize="$4" fontWeight="bold">
                  Temperature ({samplesLabel})
                </Text>
                {temperatureHistory.values.length > 0 ? (
                  <HistoryChart
                    testID="temperature-chart"
                    values={temperatureHistory.values}
                    hours={temperatureHistory.hours}
                    unit={`°${unit}`}
                    onDrawn={markChartDrawn}
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
                  Humidity ({samplesLabel})
                </Text>
                {humidityHistory.values.length > 0 ? (
                  <HistoryChart
                    testID="humidity-chart"
                    values={humidityHistory.values}
                    hours={humidityHistory.hours}
                    unit="%"
                    onDrawn={markChartDrawn}
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
          )}
        </YStack>
        {/* Bottom Buttons - Dash stays highlighted (node is part of the
            dashboard) but dimmed, and is still pressable to go back.
            Hidden (but still taking its space, so nothing shifts) while the
            node loads - the loading screen covers the whole frame. */}
        <YStack
          testID="node-nav"
          width="100%"
          justify="flex-end"
          opacity={ready ? 1 : 0}
          pointerEvents={ready ? "auto" : "none"}
        >
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
                // Gray like Map/Config: blue marks the screen you're on, and
                // the node view isn't one of the tabs - all three lead away.
                theme="gray"
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

        {/* Loading screen over the whole frame, bottom bar included */}
        {!ready && (
          <YStack
            testID="node-loading"
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            items="center"
            justify="center"
            gap="$3"
          >
            <Spinner size="large" color={colors.text} />
            <Text color={colors.text} fontSize="$4">
              Fetching Node {node}
            </Text>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}