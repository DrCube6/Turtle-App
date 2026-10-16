import { router, usePathname } from "expo-router";
import { useEffect } from "react";

import { useBLE } from "@/context/BLEContext";

// Screens that only make sense while connected to the main controller
const CONNECTED_SCREENS = ["/dashboard", "/map", "/config", "/init", "/node", "/pick-location"];

// Mounted once in the root layout. When the hub drops the connection on its
// own, go back to the hub screen (which shows a red "disconnected" message).
export function ConnectionLostRedirect() {
  const { connectionLost } = useBLE();
  const pathname = usePathname();

  useEffect(() => {
    if (connectionLost && CONNECTED_SCREENS.includes(pathname)) {
      console.log(`Connection lost on ${pathname}, returning to hub screen`);
      router.dismissTo("/hub_connect");
    }
    // Only react to the connection dropping, not to every navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionLost]);

  return null;
}
