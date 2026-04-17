import type { NotificationPort } from "@mesher/domain";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { useIncomingMessagePreviewStore } from "../state/incomingMessagePreviewStore";

/** Android channel for incoming mesh messages (high importance; separate from BLE relay FGS). */
export const MESHER_MESSAGE_NOTIFICATION_CHANNEL_ID = "mesher_messages";

let infraReady = false;

// Foreground presentation trade-off: see docs/ios-local-notifications.md §7.
// iOS Personal Team: aps-environment is stripped via plugins/withMesherStripPushEntitlement.js
// (listed before expo-notifications in app.json — see doc §5).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Creates Android notification channel, requests OS permission, configures handler.
 * Call once before mesh transport delivers previews (e.g. from initMeshRuntime).
 */
export async function setupMessageNotificationInfra(): Promise<void> {
  if (infraReady) return;

  if (Platform.OS === "web") {
    infraReady = true;
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(MESHER_MESSAGE_NOTIFICATION_CHANNEL_ID, {
      name: "Mesher messages",
      description: "Alerts when a mesh message arrives for this device",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      sound: "default",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }

  infraReady = true;
}

export function createMessageNotifications(): NotificationPort {
  return {
    async showLocalMessagePreview(title: string, body: string) {
      const state = AppState.currentState;
      if (state === "active" || Platform.OS === "web") {
        useIncomingMessagePreviewStore.getState().show(title, body);
        return;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            ...(Platform.OS === "android" && {
              channelId: MESHER_MESSAGE_NOTIFICATION_CHANNEL_ID,
            }),
          },
          trigger: null,
        });
      } catch (e) {
        console.warn("[mesher:notifications] scheduleNotificationAsync failed", e);
        useIncomingMessagePreviewStore.getState().show(title, body);
      }
    },
  };
}
