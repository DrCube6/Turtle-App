import Constants from "expo-constants";
import { Platform, StyleSheet } from "react-native";
import MapView, { PROVIDER_GOOGLE, type Region } from "react-native-maps";

// Where the map opens. Swap for the nesting site / hatchery location.
export const DEFAULT_REGION: Region = {
  latitude: 27.9944,
  longitude: -81.7603,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// Android only has Google Maps. iOS uses Google Maps when an iOS key was
// configured at build time (app.config.js), otherwise Apple Maps - asking
// for Google on iOS without the key/SDK would crash.
const useGoogleProvider =
  Platform.OS === "android" ||
  Boolean(Constants.expoConfig?.ios?.config?.googleMapsApiKey);

type Props = {
  initialRegion?: Region;
};

export function SensorMap({ initialRegion = DEFAULT_REGION }: Props) {
  return (
    <MapView
      testID="sensor-map"
      style={StyleSheet.absoluteFill}
      provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      mapType="hybrid"
      showsCompass
      toolbarEnabled={false}
    />
  );
}
