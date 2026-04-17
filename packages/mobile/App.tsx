import "./global.css";

import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { DebugLogFloatingOverlay } from "./src/logging/DebugLogFloatingOverlay";
import { IncomingMessageBanner } from "./src/ui/IncomingMessageBanner";
import { NAV_THEME } from "@/lib/theme";

export default function App() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAV_THEME[scheme]}>
        <IncomingMessageBanner />
        <RootNavigator />
        <DebugLogFloatingOverlay />
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <PortalHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
