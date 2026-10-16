import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import type { LatLng } from "react-native-maps";
import { Button, Separator, XStack, YStack } from "tamagui";
import { NodeInfoPanel, PlaceNodePanel } from "@/components/MapPanels";
import { SensorMap } from "@/components/SensorMap";
import { useBLE } from "@/context/BLEContext";
import { useNodePlacements } from "@/hooks/useNodePlacements";
import { useSavedMapView } from "@/hooks/useSavedMapView";
import { useDefaultMapView } from "@/hooks/useDefaultMapView";
import { isHub, nodesInData } from "@/utils/nodes";
import { useOpenScreen } from "@/hooks/useOpenScreen";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

// Haptics are a nice-to-have - never let them throw
const buzz = (style: Haptics.ImpactFeedbackStyle) => {
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch {}
};

export default function Map() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  // Main screens open like tabs - no duplicate copies piling up
  const openScreen = useOpenScreen();
  const { sensorData } = useBLE();
  const { placements, placeNode } = useNodePlacements();
  // Reopen the map where it was left (saved on the phone, like placements)
  const { savedView, saveView } = useSavedMapView();
  // Where the home button goes (chosen in Config > Change Default Map Location)
  const { defaultView } = useDefaultMapView();

  // Placing: where the red pin is, and which node was picked for it
  const [pendingCoordinate, setPendingCoordinate] = useState<LatLng | null>(null);
  const [pendingNode, setPendingNode] = useState<number | null>(null);
  // Tapped marker whose readings are shown
  const [infoNode, setInfoNode] = useState<number | null>(null);

  const isPlacing = pendingCoordinate !== null;

  // Only nodes that are in the synced CSV can be placed (hub first)
  const availableNodes = nodesInData(sensorData);

  // Most recent reading (hr 1) for the tapped node
  const infoReading =
    infoNode === null
      ? undefined
      : sensorData.find((row) => row.hr === 1 && row.node === infoNode);

  const cancelPlacing = () => {
    setPendingCoordinate(null);
    setPendingNode(null);
  };

  const handleLongPress = (coordinate: LatLng) => {
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    setInfoNode(null);
    // Long-pressing again while placing just moves the pin; the node
    // already picked stays picked
    setPendingCoordinate(coordinate);
  };

  const handleMarkerPress = (node: number) => {
    if (isPlacing) {
      // While placing, tapping a marker picks that node (to move it here)
      setPendingNode(node);
      return;
    }
    // The hub has no temperature/humidity, so there's nothing to show
    if (isHub(node)) return;
    setInfoNode(node);
  };

  const handleConfirm = async () => {
    if (pendingCoordinate === null || pendingNode === null) return;
    await placeNode(pendingNode, pendingCoordinate);
    buzz(Haptics.ImpactFeedbackStyle.Light);
    cancelPlacing();
  };

  const handleViewFullData = () => {
    if (!infoReading) return;
    openScreen("/node", {
        node: infoReading.node.toString(),
        battery: infoReading.battery.toString(),
        temperature: infoReading.temperature.toString(),
        humidity: infoReading.humidity.toString(),
      });
  };

  // Android back button closes an open panel before leaving the screen
  useEffect(() => {
    if (!isPlacing && infoNode === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cancelPlacing();
      setInfoNode(null);
      return true;
    });
    return () => sub.remove();
  }, [isPlacing, infoNode]);

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
        {/* Map - fills the space above the bottom panel. No overflow/rounding
            here: SensorMap draws its own rounded frame, because clipping the
            map shifts it sideways on Android. */}
        <YStack flex={1} width="100%">
          <SensorMap
            placements={placements}
            highlightedNode={isPlacing ? pendingNode : infoNode}
            pendingCoordinate={pendingCoordinate}
            onLongPress={handleLongPress}
            onMapPress={() => setInfoNode(null)}
            onMarkerPress={handleMarkerPress}
            onPendingMove={setPendingCoordinate}
            savedView={savedView}
            homeView={defaultView}
            onViewChange={saveView}
          />
        </YStack>

        {/* Bottom: place panel, node info, or the usual nav bar */}
        <YStack width="100%" justify="flex-end" paddingBottom={10}>
          {isPlacing ? (
            <PlaceNodePanel
              availableNodes={availableNodes}
              placements={placements}
              selectedNode={pendingNode}
              onSelect={setPendingNode}
              onCancel={cancelPlacing}
              onConfirm={handleConfirm}
            />
          ) : infoNode !== null ? (
            <NodeInfoPanel
              node={infoNode}
              reading={infoReading}
              onClose={() => setInfoNode(null)}
              onViewFullData={handleViewFullData}
            />
          ) : (
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
                theme="blue"
                disabled={true}
                disabledStyle={{ opacity: 0.5 }}
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
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}
