import { useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Text, YStack } from "tamagui";

import { useAppTheme, type ThemeMode } from "@/context/ThemeContext";

// react-native-chart-kit calls the y-axis label area "paddingRight" (it's
// on the left). Its default of 64 with labels right-aligned 12px before the
// plot left an empty strip left of the numbers, so the graph looked
// off-centre. Tighter values put the numbers near the left edge.
const LABEL_AREA = 44;
const LABEL_GAP = 6;
// Space kept right of the newest point so its dot and x label aren't cut off
const RIGHT_MARGIN = 14;
// Used until the real width is measured (outer + inner screen padding)
const FALLBACK_WIDTH = Dimensions.get("window").width - 90;

// Chart colours per theme: background matches the theme's surface; the
// line is the app's yellow (a deeper shade on white so it stays readable)
const chartConfigFor = (mode: ThemeMode, surface: string) => {
  const line = mode === "dark" ? "234, 179, 8" : "202, 138, 4";
  const label = mode === "dark" ? "255, 255, 255" : "17, 17, 17";
  return {
    backgroundGradientFrom: surface,
    backgroundGradientTo: surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${line}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${label}, ${opacity})`,
    propsForDots: {
      r: "3",
    },
  };
};

const TOOLTIP_WIDTH = 84;

type Props = {
  // Oldest -> newest
  values: number[];
  // Hours ago for each value (same order), e.g. 24 ... 1
  hours: number[];
  // Appended to values in the tooltip, e.g. "F" or "%"
  unit: string;
  testID?: string;
  height?: number;
  // Called once, when the chart has been laid out and drawn
  onDrawn?: () => void;
};

export function HistoryChart({ values, hours, unit, testID, height = 180, onDrawn }: Props) {
  const reportedDrawn = useRef(false);
  const { mode, colors } = useAppTheme();
  const chartConfig = chartConfigFor(mode, colors.surface);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const width = measuredWidth || FALLBACK_WIDTH;

  // Tapped data point, shown in a tooltip (tap it again to hide)
  const [selected, setSelected] = useState<{ index: number; x: number; y: number } | null>(null);

  // chart-kit spaces n points across n slots and leaves the last slot empty,
  // so the newest point stops well short of the right edge. Draw the chart
  // wider so the newest point lands at the edge, and clip the extra width.
  const n = values.length;
  const chartWidth =
    n > 1 ? LABEL_AREA + (n * (width - RIGHT_MARGIN - LABEL_AREA)) / (n - 1) : width;

  // Label every 4th point (plus the first and last) so the x-axis doesn't
  // get crowded with up to 24 overlapping labels
  const labels = hours.map((hr, i) =>
    i === 0 || i === n - 1 || i % 4 === 0 ? `-${hr}h` : ""
  );

  const tooltipLeft = selected
    ? Math.min(Math.max(selected.x - TOOLTIP_WIDTH / 2, 4), width - TOOLTIP_WIDTH - 4)
    : 0;
  // Above the point, or below it when the point is near the top
  const tooltipTop = selected ? (selected.y > 52 ? selected.y - 50 : selected.y + 12) : 0;

  return (
    <View
      testID={testID}
      style={[styles.frame, { height }]}
      onLayout={(e) => {
        setMeasuredWidth(e.nativeEvent.layout.width);
        // First layout = the chart has been drawn
        if (!reportedDrawn.current) {
          reportedDrawn.current = true;
          onDrawn?.();
        }
      }}
    >
      <LineChart
        data={{ labels, datasets: [{ data: values }] }}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        bezier
        yLabelsOffset={LABEL_GAP}
        style={{ paddingRight: LABEL_AREA }}
        onDataPointClick={({ index, x, y }) =>
          setSelected((prev) => (prev?.index === index ? null : { index, x, y }))
        }
      />

      {selected && selected.index < n && (
        <>
          {/* Ring around the tapped point */}
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              { left: selected.x - 7, top: selected.y - 7, borderColor: colors.text },
            ]}
          />
          <YStack
            testID={testID ? `${testID}-tooltip` : undefined}
            pointerEvents="none"
            position="absolute"
            left={tooltipLeft}
            top={tooltipTop}
            width={TOOLTIP_WIDTH}
            items="center"
            paddingVertical={4}
            rounded={8}
            borderWidth={1}
            borderColor="rgb(234, 179, 8)"
            backgroundColor="rgba(0, 0, 0, 0.85)"
          >
            <Text color="white" fontSize="$3" fontWeight="bold">
              {values[selected.index]}
              {unit}
            </Text>
            <Text color="gray" fontSize="$1">
              -{hours[selected.index]}h
            </Text>
          </YStack>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Clips the over-wide chart and rounds the corners
  frame: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
