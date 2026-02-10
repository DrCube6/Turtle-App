import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (<Tabs>
    <Tabs.Screen
      name="habitat_view"
      options={{
        headerTitle: "Habitat View",
      }}
    />
    <Tabs.Screen
      name="settings"
      options={{
        headerTitle: "Settings",
      }}
    />
  </Tabs>
  );
}
