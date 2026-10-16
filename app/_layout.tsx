import { Stack } from "expo-router";
import { TamaguiProvider, Theme, View } from "tamagui";
import { config } from "../tamagui.config";

import "@/global.css";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import { useEffect } from "react";

import { ConnectionLostRedirect } from "@/components/ConnectionLostRedirect";
import { BLEProvider } from "@/context/BLEContext";
import { AppThemeProvider, useAppTheme } from "@/context/ThemeContext";

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
    <AppThemeProvider>
      <BLEProvider>
        <TamaguiProvider config={config} defaultTheme="dark">
          <ThemedRoot />
        </TamaguiProvider>
      </BLEProvider>
    </AppThemeProvider>
  );
}

// Applies the chosen light/dark theme: Tamagui's theme (so buttons pick
// light_yellow / dark_yellow etc.) and the screen background
function ThemedRoot() {
  const { mode, colors } = useAppTheme();

  return (
    <Theme name={mode}>
      <View flex={1} backgroundColor={colors.background}>
        <ConnectionLostRedirect />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            animationDuration: 200,
            gestureEnabled: false,
            contentStyle: {
              // let the themed View above show through
              backgroundColor: "transparent"
            }
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="hub_connect" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen name="config" options={{ headerShown: false }} />
          <Stack.Screen name="init" options={{ headerShown: false }} />
          <Stack.Screen name="node" options={{ headerShown: false }} />
          <Stack.Screen name="graph" options={{ headerShown: false }} />
          <Stack.Screen name="pick-location" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </View>
    </Theme>
  );
}
