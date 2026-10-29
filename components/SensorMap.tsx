import Constants from "expo-constants";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Camera,
  type LatLng,
  type Region,
} from "react-native-maps";
import Svg, { Path, Rect } from "react-native-svg";

import { useAppTheme } from "@/context/ThemeContext";

import { useMapType } from "@/hooks/useMapType";
import type { SavedMapView } from "@/hooks/useSavedMapView";
import { isHub, nodeShortLabel } from "@/utils/nodes";

// Costa Rica's bounding box (all land borders and both coasts). On open the
// map fits these corners into whatever size the map view actually is.
// Swap for a specific nesting beach / hatchery to open zoomed in.
export const DEFAULT_BOUNDS: LatLng[] = [
  { latitude: 11.22, longitude: -85.95 }, // north-west (Nicaragua border, Pacific)
  { latitude: 8.03, longitude: -82.55 }, // south-east (Panama border)
];

// Rough first frame before the fit runs, centered on the same box
export const DEFAULT_REGION: Region = {
  latitude: 9.63,
  longitude: -84.25,
  latitudeDelta: 5,
  longitudeDelta: 4.5,
};

const FRAME_RADIUS = 20;
const FRAME_BORDER = 2;

// Home button: a 56px circle, 12px in from the top and right edges
const HOME_SIZE = 56;
const HOME_INSET = 12;
// Space the map keeps clear at the top for the button row
const CONTROLS_PADDING = { top: HOME_INSET + HOME_SIZE, right: 0, bottom: 0, left: 0 };

// Android only has Google Maps. iOS uses Google Maps when an iOS key was
// configured at build time (app.config.js), otherwise Apple Maps - asking
// for Google on iOS without the key/SDK would crash.
const useGoogleProvider =
  Platform.OS === "android" ||
  Boolean(Constants.expoConfig?.ios?.config?.googleMapsApiKey);

type Props = {
  bounds?: LatLng[];
  // Placed nodes: node number -> location
  placements?: Record<number, LatLng>;
  // Node whose marker is highlighted (tapped, or chosen in the place panel)
  highlightedNode?: number | null;
  // Where the new pin is while placing a node (null = not placing)
  pendingCoordinate?: LatLng | null;
  onLongPress?: (coordinate: LatLng) => void;
  // Tap on empty map (not on a marker)
  onMapPress?: () => void;
  onMarkerPress?: (node: number) => void;
  onPendingMove?: (coordinate: LatLng) => void;
  // Where the user last left the map: "loading" while it's being read,
  // null if nothing saved (then the map opens on homeView)
  savedView?: SavedMapView | null | "loading";
  // The chosen default ("home") view: "loading" while it's being read, null
  // if none chosen (then home is `bounds`, all of Costa Rica)
  homeView?: SavedMapView | null | "loading";
  // Called after the user pans/zooms, with the new view
  onViewChange?: (view: SavedMapView) => void;
  showHomeButton?: boolean;
  ref?: Ref<SensorMapHandle>;
};

export type SensorMapHandle = {
  // The view on screen right now - asks the map directly, so it's correct
  // even if the user taps a button right after moving the map
  getCurrentView: () => Promise<SavedMapView | null>;
};

export function SensorMap({
  bounds = DEFAULT_BOUNDS,
  placements = {},
  highlightedNode = null,
  pendingCoordinate = null,
  onLongPress,
  onMapPress,
  onMarkerPress,
  onPendingMove,
  savedView = null,
  homeView = null,
  onViewChange,
  showHomeButton = true,
  ref,
}: Props) {
  const mapRef = useRef<MapView>(null);
  // Plain map or satellite, toggled by the buttons in the top-right corner
  const { mapType, setMapType } = useMapType();
  // Last area the map reported, kept for getCurrentView
  const lastRegion = useRef<Region | null>(null);

  useImperativeHandle(ref, () => ({
    getCurrentView: async () => {
      const map = mapRef.current;
      if (!map) return null;

      let camera: Camera | undefined;
      try {
        camera = await map.getCamera();
      } catch {
        camera = undefined;
      }

      let region = lastRegion.current;
      if (!region) {
        try {
          const { northEast, southWest } = await map.getMapBoundaries();
          region = {
            latitude: (northEast.latitude + southWest.latitude) / 2,
            longitude: (northEast.longitude + southWest.longitude) / 2,
            latitudeDelta: Math.abs(northEast.latitude - southWest.latitude),
            longitudeDelta: Math.abs(northEast.longitude - southWest.longitude),
          };
        } catch {
          region = null;
        }
      }

      if (!region) return null;
      return camera ? { camera, region } : { region };
    },
  }));
  const [size, setSize] = useState({ width: 0, height: 0 });

  // initialRegion is applied before the map has its final on-screen size,
  // which crops the country. Set the starting view once the map is ready,
  // its real size is known, and the saved view (if any) has loaded.
  const isReady = useRef(false);
  const hasLayout = useRef(false);
  const hasFitted = useRef(false);

  // Show a saved view (exact camera if we have it), or fit `bounds`
  const showView = (view: SavedMapView | null, animated: boolean) => {
    const map = mapRef.current;
    if (!map) return;

    if (view?.camera) {
      if (animated) map.animateCamera(view.camera, { duration: 500 });
      else map.setCamera(view.camera);
    } else if (view) {
      map.animateToRegion(view.region, animated ? 500 : 0);
    } else {
      map.fitToCoordinates(bounds, {
        edgePadding: { top: 24, right: 24, bottom: 24, left: 24 },
        animated,
      });
    }
  };

  const fitOnce = () => {
    if (hasFitted.current || !isReady.current || !hasLayout.current) return;
    // Still being read from storage
    if (savedView === "loading" || homeView === "loading") return;
    hasFitted.current = true;

    // Where it was left, otherwise the default view
    showView(savedView ?? homeView, false);
  };

  // The saved views usually load after the map is ready
  useEffect(() => {
    fitOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedView, homeView]);

  const goHome = () => {
    showView(homeView === "loading" ? null : homeView, true);
  };

  const saveCurrentView = async (region: Region) => {
    // Ignore the default view the map reports before the start view is set
    if (!hasFitted.current) return;
    lastRegion.current = region;
    if (!onViewChange) return;

    // The camera restores the exact zoom; a region only approximately
    // (re-fitting a region can drift the zoom out a little each time)
    let camera: Camera | undefined;
    try {
      camera = await mapRef.current?.getCamera();
    } catch {
      camera = undefined;
    }
    onViewChange(camera ? { camera, region } : { region });
  };

  return (
    <View
      testID="sensor-map-container"
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ width, height });
        hasLayout.current = true;
        fitOnce();
      }}
    >
      <MapView
        ref={mapRef}
        testID="sensor-map"
        style={StyleSheet.absoluteFill}
        provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        onMapReady={() => {
          isReady.current = true;
          fitOnce();
        }}
        mapType={mapType}
        // Keep Google's own controls (the compass when rotated; Apple's
        // compass on iOS) below our button row instead of underneath it
        mapPadding={CONTROLS_PADDING}
        showsCompass
        toolbarEnabled={false}
        onRegionChangeComplete={saveCurrentView}
        onLongPress={(e) => onLongPress?.(e.nativeEvent.coordinate)}
        onPress={(e) => {
          // On some platforms a marker tap also reaches the map
          if (e.nativeEvent.action === "marker-press") return;
          onMapPress?.();
        }}
      >
        {Object.entries(placements).map(([node, coordinate]) => (
          <NodeMarker
            key={node}
            node={Number(node)}
            coordinate={coordinate}
            highlighted={Number(node) === highlightedNode}
            onPress={() => onMarkerPress?.(Number(node))}
          />
        ))}

        {pendingCoordinate && (
          <Marker
            testID="pending-pin"
            coordinate={pendingCoordinate}
            pinColor="red"
            draggable
            onDragEnd={(e) => onPendingMove?.(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>
      <RoundedFrame {...size} />

      {/* Top-right controls: (Map) (Satellite) (Home).
          Plain style objects on purpose: NativeWind wraps Pressable and
          drops style *functions*, which once left the home button
          unpositioned and tiny in the top-left corner. TouchableOpacity
          dims on press by itself. */}
      <View testID="map-controls" style={styles.controls} pointerEvents="box-none">
        {/* Map / Satellite on the left (and on their own, left-aligned,
            where there's no home button - the default location picker) */}
        <View testID="map-type-toggle" style={styles.mapTypeGroup}>
          {(
            [
              ["standard", "Map"],
              ["hybrid", "Satellite"],
            ] as const
          ).map(([type, label]) => {
            const selected = mapType === type;
            return (
              <TouchableOpacity
                key={type}
                testID={`map-type-${type}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.6}
                onPress={() => setMapType(type)}
                style={[styles.mapTypeButton, selected && styles.mapTypeButtonSelected]}
              >
                <Text style={styles.mapTypeText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Back to the default view (chosen in Config, or all of Costa
            Rica). The new view is saved like any other pan/zoom. */}
        {showHomeButton && (
          <TouchableOpacity
            testID="map-home"
            accessibilityRole="button"
            accessibilityLabel="Reset map view"
            activeOpacity={0.6}
            onPress={goHome}
            style={styles.homeButton}
          >
            <MaterialCommunityIcons name="home" size={30} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Numbered badge for a placed node. Custom-view markers on Android are drawn
// as a snapshot; tracksViewChanges must be on while the view changes or the
// badge can render blank, but leaving it on costs battery - so track briefly
// after each change, then stop.
function NodeMarker({
  node,
  coordinate,
  highlighted,
  onPress,
}: {
  node: number;
  coordinate: LatLng;
  highlighted: boolean;
  onPress: () => void;
}) {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [highlighted]);

  return (
    <Marker
      testID={`node-marker-${node}`}
      coordinate={coordinate}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      tracksViewChanges={tracking}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Padding gives the snapshot a margin so the white outline is never
          cut off at the bitmap edge */}
      <View style={styles.badgeWrapper}>
        <View
          style={[
            styles.badge,
            isHub(node) && styles.badgeHub,
            highlighted && styles.badgeHighlighted,
          ]}
        >
          <Text style={styles.badgeText}>{nodeShortLabel(node)}</Text>
        </View>
      </View>
    </Marker>
  );
}

// Rounded border drawn ON TOP of the map. Clipping the map itself with
// overflow:hidden + borderRadius makes Google Maps on Android draw shifted
// sideways (the west of the country was cut off), so instead the corners
// outside the rounded rect are painted in the background color.
function RoundedFrame({ width, height }: { width: number; height: number }) {
  const { colors } = useAppTheme();
  if (!width || !height) return null;

  const r = FRAME_RADIUS;
  // Corners painted in the screen background so they disappear into it
  const background = colors.background;

  // Full rectangle minus the rounded rectangle = the four corner pieces
  const corners =
    `M0 0H${width}V${height}H0Z ` +
    `M${r} 0H${width - r}A${r} ${r} 0 0 1 ${width} ${r}` +
    `V${height - r}A${r} ${r} 0 0 1 ${width - r} ${height}` +
    `H${r}A${r} ${r} 0 0 1 0 ${height - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;

  return (
    // The wrapping View is what lets touches through to the map: on iOS an
    // <Svg> ignores pointerEvents and swallows every pinch and long press
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Path d={corners} fill={background} fillRule="evenodd" />
        <Rect
          x={FRAME_BORDER / 2}
          y={FRAME_BORDER / 2}
          width={width - FRAME_BORDER}
          height={height - FRAME_BORDER}
          rx={r - FRAME_BORDER / 2}
          fill="none"
          stroke={colors.subtle}
          strokeWidth={FRAME_BORDER}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Same yellow as the app's dark_yellow buttons / chart line
  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "rgb(234, 179, 8)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Round to echo the map frame's rounded corners, set in from the edges so
  // it never touches the border
  // Row across the top: (Map) (Satellite) ------ (Home). Set in from the
  // edges so nothing touches the map border; taps in the gap reach the map.
  controls: {
    position: "absolute",
    top: HOME_INSET,
    left: HOME_INSET,
    right: HOME_INSET,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapTypeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Pill buttons, same dark fill / white outline as the home button;
  // the selected one turns blue like other "you are here" buttons
  mapTypeButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "rgba(32, 32, 32, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "black",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mapTypeButtonSelected: {
    backgroundColor: "rgb(37, 99, 235)",
  },
  mapTypeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  homeButton: {
    width: HOME_SIZE,
    height: HOME_SIZE,
    borderRadius: HOME_SIZE / 2,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "rgba(32, 32, 32, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    // Lift it off the satellite imagery
    elevation: 6,
    shadowColor: "black",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  badgeWrapper: {
    padding: 3,
  },
  // Bigger by real size, not transform: scale - Android snapshots the
  // marker at its layout size, so a scaled badge gets its edges clipped
  badgeHighlighted: {
    backgroundColor: "rgb(37, 99, 235)",
    minWidth: 34,
    height: 34,
    borderRadius: 17,
  },
  // The hub stands apart from the sensor nodes
  badgeHub: {
    backgroundColor: "rgb(147, 51, 234)",
  },
  badgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
});
