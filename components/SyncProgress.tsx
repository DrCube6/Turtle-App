import { Text, YStack } from "tamagui";
import { useAppTheme } from "@/context/ThemeContext";

// Progress of a chunked CSV transfer. total is 0 until the first chunk
// arrives (the hub's chunk header is what tells us the total).
export function SyncProgress({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const { colors } = useAppTheme();
  const known = total > 0;
  const fraction = known ? Math.min(received / total, 1) : 0;
  const percent = Math.round(fraction * 100);

  return (
    <YStack width="80%" gap={12} items="center">
      <Text color={colors.text} fontSize="$5">
        Syncing...
      </Text>

      <YStack
        testID="sync-progress-bar"
        width="100%"
        height={14}
        rounded={7}
        borderWidth={2}
        borderColor={colors.subtle}
        overflow="hidden"
      >
        <YStack
          testID="sync-progress-fill"
          height="100%"
          width={`${percent}%`}
          // Same yellow as the node buttons / map markers
          backgroundColor="rgb(234, 179, 8)"
        />
      </YStack>

      <Text color={colors.muted} fontSize="$3">
        {known
          ? `${received} / ${total} chunks (${percent}%)`
          : "Waiting for the hub..."}
      </Text>
    </YStack>
  );
}
