import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Gap between the screen edge and the rounded outer frame - the same as the
// frame's side padding (Tamagui $4)
export const SCREEN_GAP = 18;

// Top/bottom padding for a screen's outer container, so the rounded frame
// sits the same distance from the top and the bottom. Adds the phone's own
// safe areas (iPhone notch / home indicator; 0 on Android here, where the
// content starts below the status bar and the nav bar is hidden), instead
// of the old fixed 30 (Android) / 60 (iOS) at the top only.
export function useScreenPadding() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + SCREEN_GAP,
    paddingBottom: insets.bottom + SCREEN_GAP,
  };
}
