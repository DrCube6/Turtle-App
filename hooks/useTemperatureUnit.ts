import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { TemperatureUnit } from '@/utils/temperature';

// Celsius or Fahrenheit, chosen in Config and remembered on this phone.
export const TEMPERATURE_UNIT_KEY = 'turtle_temperature_unit';
const DEFAULT_UNIT: TemperatureUnit = 'C';

// One copy shared by every screen using the hook, so switching it in Config
// also updates the map / node view still open underneath.
let shared: TemperatureUnit = DEFAULT_UNIT;
let loading: Promise<void> | null = null;
const listeners = new Set<(unit: TemperatureUnit) => void>();

const publish = (next: TemperatureUnit) => {
  shared = next;
  listeners.forEach((listener) => listener(next));
};

const load = () => {
  loading ??= AsyncStorage.getItem(TEMPERATURE_UNIT_KEY)
    .then((saved) => {
      if (saved === 'C' || saved === 'F') publish(saved);
    })
    .catch((e) => console.warn('Failed to load temperature unit', e));
  return loading;
};

export function useTemperatureUnit() {
  const [unit, setUnitState] = useState<TemperatureUnit>(shared);

  useEffect(() => {
    let active = true;
    listeners.add(setUnitState);
    load().then(() => {
      if (active) setUnitState(shared);
    });

    return () => {
      active = false;
      listeners.delete(setUnitState);
      // Nobody is using it any more: re-read storage next time
      if (listeners.size === 0) {
        loading = null;
        shared = DEFAULT_UNIT;
      }
    };
  }, []);

  const setUnit = useCallback(async (next: TemperatureUnit) => {
    publish(next);
    try {
      await AsyncStorage.setItem(TEMPERATURE_UNIT_KEY, next);
    } catch (e) {
      console.warn('Failed to save temperature unit', e);
    }
  }, []);

  return { unit, setUnit };
}
