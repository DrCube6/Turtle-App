import { router } from "expo-router";
import { useRef } from "react";
import { Button, Separator, Text, XStack, YStack } from "tamagui";

import { SensorMap, type SensorMapHandle } from "@/components/SensorMap";
import { useDefaultMapView } from "@/hooks/useDefaultMapView";
import { useNodePlacements } from "@/hooks/useNodePlacements";
import { useAppTheme } from "@/context/ThemeContext";
import { useScreenPadding } from "@/hooks/useScreenPadding";

// Change Default Map Location: move and zoom the map to exactly the view
// the map's home button should return to, then confirm. What you see is
// what you get - no address search or location permission needed.
export default function PickLocation() {
  const screenPadding = useScreenPadding();
  const { colors } = useAppTheme();
  const { defaultView, saveDefaultView } = useDefaultMapView();
  // Placed nodes shown for reference while framing the view
  const { placements } = useNodePlacements();

  const map = useRef<SensorMapHandle>(null);

  const handleConfirm = async () => {
    // Ask the map where it is right now (not the last "moved" report,
    // which can lag behind a quick tap after moving)
    const view = await map.current?.getCurrentView();
    // Map not ready yet: keep the current default
    if (view) {
      await saveDefaultView(view);
    }
    router.back();
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
            Default Map Location
          </Text>
          <Text color={colors.muted} fontSize="$3">
            Move and zoom the map to the view you want, then Confirm.
          </Text>
          <Separator
            borderColor={colors.subtle}
            borderBottomWidth={3}
            alignSelf="stretch"
            rounded="$2"
          />
        </YStack>

        {/* Opens on the current default (all of Costa Rica until one is
            chosen). No overflow/rounding here - SensorMap draws its own frame. */}
        <YStack flex={1} width="100%">
          <SensorMap
            ref={map}
            placements={placements}
            savedView={defaultView}
            showHomeButton={false}
          />
        </YStack>

        <XStack
          borderWidth={2}
          justify="space-between"
          items="center"
          borderColor={colors.border}
          padding={10}
          rounded={20}
          width="100%"
          gap={10}
          marginBottom={10}
        >
          <Button size="$3" theme="gray" onPress={() => router.back()}>
            ✕ Cancel
          </Button>
          <Button size="$3" theme="green" onPress={handleConfirm}>
            ✓ Confirm
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
