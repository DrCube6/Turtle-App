import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { Camera, Region } from 'react-native-maps';

// Where the user last left the map. Saved on this phone, like node placements.
// camera restores the exact view (center, zoom, rotation, tilt); region is
// the fallback when the camera can't be read.
export type SavedMapView = {
  camera?: Camera;
  region: Region;
};

export const MAP_VIEW_KEY = 'turtle_map_view';

export function useSavedMapView() {
  // "loading" = still reading storage, null = nothing saved yet
  const [savedView, setSavedView] = useState<SavedMapView | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(MAP_VIEW_KEY)
      .then(saved => {
        if (!cancelled) setSavedView(saved ? JSON.parse(saved) : null);
      })
      .catch(e => {
        console.warn('Failed to load map view', e);
        if (!cancelled) setSavedView(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Not put back into state: the map already shows this view
  const saveView = useCallback(async (view: SavedMapView) => {
    try {
      await AsyncStorage.setItem(MAP_VIEW_KEY, JSON.stringify(view));
    } catch (e) {
      console.warn('Failed to save map view', e);
    }
  }, []);

  return { savedView, saveView };
}
