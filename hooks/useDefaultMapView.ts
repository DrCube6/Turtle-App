import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { SavedMapView } from '@/hooks/useSavedMapView';

// The map's "home" view, chosen on the Change Default Map Location screen.
// null = never chosen, so the map falls back to fitting all of Costa Rica.
// Saved on this phone, like node placements.
export const DEFAULT_MAP_VIEW_KEY = 'turtle_default_map_view';

type Value = SavedMapView | null | 'loading';

// One copy shared by every screen using the hook, so a new default chosen
// in the picker reaches the map's home button even while the map is still
// open underneath.
let shared: Value = 'loading';
let loading: Promise<void> | null = null;
const listeners = new Set<(value: Value) => void>();

const publish = (next: Value) => {
  shared = next;
  listeners.forEach((listener) => listener(next));
};

const load = () => {
  loading ??= AsyncStorage.getItem(DEFAULT_MAP_VIEW_KEY)
    .then((saved) => publish(saved ? JSON.parse(saved) : null))
    .catch((e) => {
      console.warn('Failed to load default map view', e);
      publish(null);
    });
  return loading;
};

export function useDefaultMapView() {
  // "loading" while storage is being read
  const [defaultView, setDefaultView] = useState<Value>(shared);

  useEffect(() => {
    let active = true;
    listeners.add(setDefaultView);
    load().then(() => {
      if (active) setDefaultView(shared);
    });

    return () => {
      active = false;
      listeners.delete(setDefaultView);
      // Nobody is using it any more: re-read storage next time
      if (listeners.size === 0) {
        loading = null;
        shared = 'loading';
      }
    };
  }, []);

  const saveDefaultView = useCallback(async (view: SavedMapView) => {
    publish(view);
    try {
      await AsyncStorage.setItem(DEFAULT_MAP_VIEW_KEY, JSON.stringify(view));
    } catch (e) {
      console.warn('Failed to save default map view', e);
    }
  }, []);

  return { defaultView, saveDefaultView };
}
