import { router, useLocalSearchParams } from "expo-router";
import { Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { ScrollView, Separator, Text, XStack, YStack } from "tamagui";

import { useBLE } from "@/context/BLEContext";

const screenWidth = Dimensions.get("window").width;
// Account for the outer YStack's padding ($4 + $5) on both sides
const CHART_WIDTH = screenWidth - 90;

const chartConfig = {
  backgroundGradientFrom: "#1a1a1a",
  backgroundGradientTo: "#1a1a1a",
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(234, 179, 8, ${opacity})`, // matches dark_yellow theme
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  propsForDots: {
    r: "3",
  },
};

export default function Node() {

  //get params
  const { node, battery, temperature, humidity } = useLocalSearchParams();
  const { sensorData } = useBLE();

  console.log("selected Node: ", node);

  const nodeNum = Number(node);

  // All HR readings (1 = most recent, up to 24 = oldest) for this node,
  // sorted oldest -> newest so the chart reads left-to-right as a timeline
  const nodeHistory = sensorData
    .filter(row => row.node === nodeNum)
    .sort((a, b) => b.hr - a.hr);

  const hasHistory = nodeHistory.length > 0;

  // Label every 4th point (plus the first and last) so the x-axis doesn't
  // get crowded with up to 24 overlapping labels
  const chartLabels = nodeHistory.map((row, i) => {
    const isEdge = i === 0 || i === nodeHistory.length - 1;
    return (isEdge || i % 4 === 0) ? `-${row.hr}h` : '';
  });

  const temperatureSeries = nodeHistory.map(row => row.temperature);
  const humiditySeries = nodeHistory.map(row => row.humidity);

  return (
    <YStack
      flex={1}
      backgroundColor="$gray12"
      items={"center"}
      padding="$4"
      paddingTop={30}
      paddingBottom={10}
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
        <YStack flex={1} width="100%" items="center" gap="$4">
          {/* Top Header */}
          <YStack gap={10} width="100%">
            <XStack justify="space-between" width="100%">
              <Text color="white" fontSize="$5" fontWeight="bold">
                Node {node}
              </Text>
              <Text color="white" fontSize="$5" fontWeight="bold">
                {battery}%
              </Text>
            </XStack>
            <Separator
              borderColor="gray"
              borderBottomWidth={3}
              alignSelf="stretch"
              rounded="$2"
            />
          </YStack>

          {/* Scrollview content - latest values, then the two history graphs */}
          <ScrollView width="100%" backgroundColor="">
            <YStack gap="$4" paddingBottom={20}>

              {/* Latest values */}
              <YStack
                borderWidth={2}
                borderColor={"gray"}
                padding={15}
                rounded={10}
              >
                <XStack justify="space-between">
                  <Text color="white" fontSize="$4">
                    Temperature
                  </Text>
                  <Text color="white" fontSize="$4">
                    {temperature}F
                  </Text>
                </XStack>
              </YStack>

              <YStack
                borderWidth={2}
                borderColor={"gray"}
                padding={15}
                rounded={10}
              >
                <XStack justify="space-between">
                  <Text color="white" fontSize="$4">
                    Humidity
                  </Text>
                  <Text color="white" fontSize="$4">
                    {humidity}%
                  </Text>
                </XStack>
              </YStack>

              {/* Temperature graph */}
              <YStack gap="$2">
                <Text color="white" fontSize="$4" fontWeight="bold">
                  Temperature (last 24h)
                </Text>
                {hasHistory ? (
                  <LineChart
                    data={{
                      labels: chartLabels,
                      datasets: [{ data: temperatureSeries }],
                    }}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 10 }}
                  />
                ) : (
                  <Text color="gray" fontSize="$3">
                    No history data yet
                  </Text>
                )}
              </YStack>

              {/* Humidity graph */}
              <YStack gap="$2">
                <Text color="white" fontSize="$4" fontWeight="bold">
                  Humidity (last 24h)
                </Text>
                {hasHistory ? (
                  <LineChart
                    data={{
                      labels: chartLabels,
                      datasets: [{ data: humiditySeries }],
                    }}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 10 }}
                  />
                ) : (
                  <Text color="gray" fontSize="$3">
                    No history data yet
                  </Text>
                )}
              </YStack>

            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </YStack>
  );
}