import { Stack } from "expo-router";
import { TamaguiProvider, View } from "tamagui";
import { config } from "../tamagui.config";

import "@/global.css";
import { HabitatProvider } from "../context/HabitatContext";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import { useEffect } from "react";

export default function RootLayout() {
  // hide nav bar on android
useEffect(() => {
    if (Platform.OS === "android") {
      const setupNavigationBar = async () => {
        try {
          // Optional: hide the navigation bar (change to "visible" if you want it shown)
          await NavigationBar.setVisibilityAsync("hidden");

          // Set behavior
          await NavigationBar.setBehaviorAsync("overlay-swipe");
        } catch (error) {
          // This catches the "undefined" or "not available yet" cases gracefully
          console.warn("NavigationBar setup failed (this is normal during early render):", error);
        }
      };

      // Small delay helps on Android dev builds
      setTimeout(setupNavigationBar, 100);
    }
  }, []);

  return (
    <HabitatProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <View flex={1} backgroundColor="$gray12">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            animationDuration: 200,
            gestureEnabled: false,
            contentStyle: {
              backgroundColor: "$gray12"
            }
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
          <Stack.Screen name="ble_test" options={{ headerShown: false }} />
          <Stack.Screen name="ble_monitor" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
        </View>
      </TamaguiProvider>
    </HabitatProvider>
  );
}
