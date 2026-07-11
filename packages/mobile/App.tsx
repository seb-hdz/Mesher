import "./global.css";

import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { WelcomeNameSheet } from "./src/components/config/WelcomeNameSheet";
import { MeshRuntimeStatusAlert } from "./src/components/MeshRuntimeStatusAlert";
import { DebugLogFloatingOverlay } from "./src/logging/DebugLogFloatingOverlay";
import { useMeshStore } from "./src/state/meshStore";
import { IncomingMessageBanner } from "./src/ui/IncomingMessageBanner";
import { NAV_THEME, screenBackgroundForScheme } from "@/lib/theme";

function readScheduledJobId(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data) return null;
  const type = data.type;
  const jobId = data.jobId;
  if (
    type === "scheduled_send" &&
    typeof jobId === "string" &&
    jobId.length > 0
  ) {
    return jobId;
  }
  return null;
}

export default function App() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const bootstrap = useMeshStore((s) => s.bootstrap);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const processJob = (jobId: string) => {
      const store = useMeshStore.getState();
      if (!store.ready) {
        // Runtime not ready yet; drainSiriQueues on init will pick due jobs.
        console.log(
          `[mesher:siri] deferred scheduled job until ready jobId=${jobId}`
        );
        return;
      }
      void store.processScheduledSiriJob(jobId);
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const jobId = readScheduledJobId(data);
        if (jobId) processJob(jobId);
      }
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        // When the app is foregrounded at fire time, also drain the job without requiring a tap.
        if (AppState.currentState !== "active") return;
        const data = notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const jobId = readScheduledJobId(data);
        if (jobId) processJob(jobId);
      }
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const jobId = readScheduledJobId(data);
      if (jobId) processJob(jobId);
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: screenBackgroundForScheme(scheme) }}
    >
      <SafeAreaProvider>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <IncomingMessageBanner />
          <RootNavigator />
          <MeshRuntimeStatusAlert />
          <WelcomeNameSheet />
          <DebugLogFloatingOverlay />
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <PortalHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
