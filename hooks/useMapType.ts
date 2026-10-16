import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// "standard" = plain map colours (lighter, faster); "hybrid" = satellite
// imagery with road/place labels. Remembered on this phone.
export type MapTypeChoice = 'standard' | 'hybrid';

export const MAP_TYPE_KEY = 'turtle_map_type';
const DEFAULT_MAP_TYPE: MapTypeChoice = 'hybrid';

export function useMapType() {
  const [mapType, setMapTypeState] = useState<MapTypeChoice>(DEFAULT_MAP_TYPE);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MAP_TYPE_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'standard' || saved === 'hybrid')) {
          setMapTypeState(saved);
        }
      })
      .catch((e) => console.warn('Failed to load map type', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const setMapType = useCallback(async (next: MapTypeChoice) => {
    setMapTypeState(next);
    try {
      await AsyncStorage.setItem(MAP_TYPE_KEY, next);
    } catch (e) {
      console.warn('Failed to save map type', e);
    }
  }, []);

  return { mapType, setMapType };
}
