import { Stack } from "expo-router";
import { TamaguiProvider } from "tamagui";
import { config } from "../tamagui.config";

import "@/global.css";
import { HabitatProvider } from "../context/HabitatContext";

export default function RootLayout() {
  return (
    <HabitatProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            animationDuration: 200,
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="hub_connect" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen name="config" options={{ headerShown: false }} />
          <Stack.Screen name="config_edit" options={{ headerShown: false }} />
          <Stack.Screen name="node" options={{ headerShown: false }} />
          <Stack.Screen name="graph" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </TamaguiProvider>
    </HabitatProvider>
  );
}
