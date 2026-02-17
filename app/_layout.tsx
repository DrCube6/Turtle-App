import { Stack } from "expo-router";
import { TamaguiProvider } from "tamagui";
import { config } from "../tamagui.config";

import "@/global.css";
import { HabitatProvider } from "../context/HabitatContext";

export default function RootLayout() {
  return (
    <HabitatProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="habitat_selection"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="test"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create_new_habitat"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="+not-found"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </TamaguiProvider>
    </HabitatProvider>
  );
}
