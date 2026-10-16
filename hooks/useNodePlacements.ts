import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from 'react-native-maps';

// node number -> where it sits on the map (0 = the hub)
export type NodePlacements = Record<number, LatLng>;

// Saved on this phone only for now. Kept behind this hook so it can later
// move to the cloud / hub without touching the map screen.
export const NODE_PLACEMENTS_KEY = 'turtle_node_placements';

// One copy shared by every screen using the hook, so a change on one screen
// (e.g. "Reset all" on Config) shows up immediately on another that is still
// open underneath (the map).
let shared: NodePlacements = {};
let loading: Promise<void> | null = null;
const listeners = new Set<(placements: NodePlacements) => void>();

const publish = (next: NodePlacements) => {
  shared = next;
  listeners.forEach((listener) => listener(next));
};

// Read storage once while any screen is using the hook
const load = () => {
  loading ??= AsyncStorage.getItem(NODE_PLACEMENTS_KEY)
    .then((saved) => {
      if (saved) publish(JSON.parse(saved));
    })
    .catch((e) => console.warn('Failed to load node placements', e));
  return loading;
};

const save = async (next: NodePlacements) => {
  try {
    await AsyncStorage.setItem(NODE_PLACEMENTS_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save node placements', e);
  }
};

export function useNodePlacements() {
  const [placements, setPlacements] = useState<NodePlacements>(shared);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listeners.add(setPlacements);

    load().then(() => {
      if (!active) return;
      setPlacements(shared);
      setIsLoaded(true);
    });

    return () => {
      active = false;
      listeners.delete(setPlacements);
      // Nobody is using it any more: re-read storage next time
      if (listeners.size === 0) {
        loading = null;
        shared = {};
      }
    };
  }, []);

  // Place a node, or move it if it's already on the map
  const placeNode = useCallback(async (node: number, coordinate: LatLng) => {
    const next: NodePlacements = { ...shared, [node]: coordinate };
    publish(next);
    await save(next);
  }, []);

  // Remove every node (and the hub) from the map
  const clearPlacements = useCallback(async () => {
    publish({});
    try {
      await AsyncStorage.removeItem(NODE_PLACEMENTS_KEY);
    } catch (e) {
      console.warn('Failed to clear node placements', e);
    }
  }, []);

  return { placements, isLoaded, placeNode, clearPlacements };
}
