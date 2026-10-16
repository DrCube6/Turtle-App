import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Fill level rounded to the nearest 10%, like a phone status bar
export function batteryIconName(percent: number | undefined): IconName {
  if (percent === undefined || !Number.isFinite(percent)) return "battery-unknown";
  if (percent < 5) return "battery-alert-variant-outline";
  const tens = Math.round(percent / 10) * 10;
  if (tens >= 100) return "battery";
  return `battery-${tens}` as IconName;
}

// Green when healthy, yellow getting low, red when nearly empty
export function batteryColor(percent: number | undefined): string {
  if (percent === undefined || !Number.isFinite(percent)) return "gray";
  if (percent <= 20) return "#ef4444";
  if (percent <= 50) return "#eab308";
  return "#22c55e";
}

export function BatteryIcon({
  percent,
  size = 20,
}: {
  percent: number | undefined;
  size?: number;
}) {
  return (
    <MaterialCommunityIcons
      testID="battery-icon"
      name={batteryIconName(percent)}
      size={size}
      color={batteryColor(percent)}
    />
  );
}
