import { Stack } from "expo-router";

export default function RootLayout() {
  return (<Stack>
    <Stack.Screen
      name="index"
      options={{
        headerTitle: "Turtle App",
        headerLeft: () => null,
      }}
    />
    <Stack.Screen
      name="+not-found"
      options={{
        headerShown: false,
      }}
    />
  </Stack>
  );
}
