// Panels shown under the map in place of the Dash/Map/Config bar. Plain
// in-layout views on purpose - no dropdowns, popovers or portals.
import { Button, ScrollView, Separator, Text, XStack, YStack } from "tamagui";

import { BatteryIcon } from "@/components/BatteryIcon";
import type { NodePlacements } from "@/hooks/useNodePlacements";
import type { SensorData } from "@/utils/csv";
import { isHub, nodeLabel, nodeShortLabel } from "@/utils/nodes";
import { useAppTheme } from "@/context/ThemeContext";

// Panel frame; borderColor (gray, like the map frame above) is set per
// theme where it is used
const panelFrame = {
  borderWidth: 2,
  padding: 10,
  rounded: 20,
  width: "100%",
  gap: 10,
} as const;

// Long-press: pick which node goes at the red pin, then place or cancel
export function PlaceNodePanel({
  availableNodes,
  placements,
  selectedNode,
  onSelect,
  onCancel,
  onConfirm,
}: {
  // Nodes in the synced CSV (hub = 0 first) - only these can be placed
  availableNodes: number[];
  placements: NodePlacements;
  selectedNode: number | null;
  onSelect: (node: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors, mode } = useAppTheme();
  const isMove = selectedNode !== null && placements[selectedNode] !== undefined;
  const label = selectedNode === null ? "" : nodeLabel(selectedNode);

  return (
    <YStack {...panelFrame} borderColor={colors.subtle}>
      <XStack justify="space-between" items="center">
        <Text color={colors.text} fontSize="$4" fontWeight="bold">
          Place node
        </Text>
        <Text color={colors.muted} fontSize="$2">
          Drag the red pin to adjust
        </Text>
      </XStack>

      <Separator borderColor={colors.border} borderBottomWidth={1} alignSelf="stretch" />

      <Text color={colors.muted} fontSize="$2" text="center">
        {availableNodes.length === 0
          ? "No nodes yet - sync from the Dashboard first."
          : selectedNode === null
            ? "Choose a node to place at the pin."
            : isMove
              ? `Confirm to reposition ${label}`
              : `${label} will be placed at the pin.`}
      </Text>

      {/* Every node visible - one tap to pick. Purple = hub, yellow = node
          already on the map, blue = selected (same colors as the map
          markers). The scroll bar stays visible so it's clear there are
          more to the right (persistentScrollbar: Android; iOS shows it
          while scrolling). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        persistentScrollbar
        indicatorStyle={mode === "dark" ? "white" : "black"}
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        <XStack gap={8}>
          {availableNodes.map((node) => (
            <Button
              key={node}
              testID={`place-node-${node}`}
              size="$3"
              theme={
                node === selectedNode
                  ? "blue"
                  : isHub(node)
                    ? "purple"
                    : placements[node]
                      ? "yellow"
                      : "gray"
              }
              onPress={() => onSelect(node)}
            >
              {nodeShortLabel(node)}
            </Button>
          ))}
        </XStack>
      </ScrollView>

      <XStack justify="space-between">
        <Button size="$3" theme="red" onPress={onCancel}>
          ✕ Cancel
        </Button>
        <Button
          size="$3"
          theme="green"
          onPress={onConfirm}
          disabled={selectedNode === null}
          disabledStyle={{ opacity: 0.5 }}
        >
          {isMove ? "✓ Move" : "✓ Place"}
        </Button>
      </XStack>
    </YStack>
  );
}

// Tapped a marker: battery and latest readings; a reading opens the node view
export function NodeInfoPanel({
  node,
  reading,
  onClose,
  onViewFullData,
}: {
  node: number;
  reading: SensorData | undefined;
  onClose: () => void;
  onViewFullData: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <YStack {...panelFrame} borderColor={colors.subtle}>
      {/* Node and its battery */}
      <XStack justify="space-between" items="center">
        <Text color={colors.text} fontSize="$4" fontWeight="bold">
          {nodeLabel(node)}
        </Text>
        {reading && (
          <XStack gap={6} items="center">
            <Text color={colors.text} fontSize="$4">
              {reading.battery}%
            </Text>
            <BatteryIcon percent={reading.battery} />
          </XStack>
        )}
      </XStack>

      <Separator borderColor={colors.border} borderBottomWidth={1} alignSelf="stretch" />

      {/* Close, then the latest readings - tapping either reading opens the
          full node view. Yellow like the dashboard's node buttons, which
          also open it. */}
      <XStack gap={8} items="center">
        <Button
          testID="info-close"
          size="$3"
          theme="gray"
          onPress={onClose}
        >
          ✕ Close
        </Button>
        {reading ? (
          <>
            <Button
              testID="info-temperature"
              size="$3"
              theme="yellow"
              flex={1}
              paddingHorizontal={6}
              onPress={onViewFullData}
            >
              {`${reading.temperature}°F`}
            </Button>
            <Button
              testID="info-humidity"
              size="$3"
              theme="yellow"
              flex={1}
              paddingHorizontal={6}
              onPress={onViewFullData}
            >
              {`${reading.humidity}%`}
            </Button>
          </>
        ) : (
          <Text color={colors.muted} fontSize="$2" flex={1}>
            No readings yet - sync from the Dashboard.
          </Text>
        )}
      </XStack>
    </YStack>
  );
}
