import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Gap between the screen edge and the rounded outer frame - the same as the
// frame's side padding (Tamagui $4)
export const SCREEN_GAP = 18;

// Top/bottom padding for a screen's outer container, so the rounded frame
// sits the same distance from the top and the bottom.
//
// Android: the content starts below the status bar and the nav bar is
// hidden, so the insets are 0 and the frame gets SCREEN_GAP on both ends.
//
// iOS: the app draws under the status bar and home indicator. The top inset
// (notch / Dynamic Island, ~50-60pt) already leaves room, so adding the gap
// on top of it looked like a big empty band. At the bottom the home
// indicator line fits inside the normal gap, so the frame reaches down as
// close as it does to the sides instead of stopping 34pt + gap short.
export function useScreenPadding() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') {
    return {
      paddingTop: Math.max(insets.top, SCREEN_GAP),
      paddingBottom: SCREEN_GAP,
    };
  }
  return {
    paddingTop: insets.top + SCREEN_GAP,
    paddingBottom: insets.bottom + SCREEN_GAP,
  };
}
