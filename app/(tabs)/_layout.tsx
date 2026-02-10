import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="habitat_view"
        options={{
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
