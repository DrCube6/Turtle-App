import { router, useNavigation, type Href } from 'expo-router';
import { useCallback } from 'react';

type Target = '/dashboard' | '/map' | '/config' | '/node';

// Open a main screen like a tab: if it's already open somewhere in the
// stack, go back to that copy (closing the screens above it); otherwise
// open it. Plain router.push stacked a new copy every time, so going
// Map -> Node -> Map -> Node... kept every Google Map alive until the app
// ran out of memory.
export function useOpenScreen() {
  const navigation = useNavigation();

  return useCallback(
    (pathname: Target, params?: Record<string, string>) => {
      const href = (params ? { pathname, params } : pathname) as Href;
      const name = pathname.slice(1);
      const routes = navigation.getState()?.routes ?? [];

      if (routes.some((route) => route.name === name)) {
        // Back to the existing copy (with new params, e.g. another node)
        router.dismissTo(href);
      } else {
        router.push(href);
      }
    },
    [navigation]
  );
}
