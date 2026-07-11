import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import type { LinkingOptions } from "@react-navigation/native";
import { INCOMING_MESSAGE_NOTIFICATION_TYPE } from "../adapters/notifications";
import type { RootStackParamList } from "./types";

const prefix = Linking.createURL("/");

function urlFromIncomingMessageData(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data || data.type !== INCOMING_MESSAGE_NOTIFICATION_TYPE) return null;
  const peerId = data.peerId;
  if (typeof peerId === "string" && peerId.length > 0) {
    return Linking.createURL(`chat/${encodeURIComponent(peerId)}`);
  }
  // Unknown sender: open conversation list.
  return Linking.createURL("messages");
}

export const mesherNavigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, "mesher://"],
  config: {
    screens: {
      Main: {
        screens: {
          Nearby: "nearby",
          Messages: "messages",
          Contacts: "contacts",
          Settings: "settings",
        },
      },
      Pair: "pair",
      Chat: {
        path: "chat/:peerId",
        parse: {
          peerId: (peerId: string) => {
            try {
              return decodeURIComponent(peerId);
            } catch {
              return peerId;
            }
          },
        },
      },
      Compose: {
        path: "compose",
        parse: {
          peerId: (peerId: string) => peerId,
          body: (body: string) => {
            try {
              return decodeURIComponent(body);
            } catch {
              return body;
            }
          },
        },
      },
    },
  },

  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url != null) return url;

    const response = await Notifications.getLastNotificationResponseAsync();
    return urlFromIncomingMessageData(
      response?.notification.request.content.data as
        | Record<string, unknown>
        | undefined
    );
  },

  subscribe(listener) {
    const linkingSub = Linking.addEventListener("url", ({ url }) => {
      listener(url);
    });

    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = urlFromIncomingMessageData(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined
        );
        if (url) listener(url);
      }
    );

    return () => {
      linkingSub.remove();
      notifSub.remove();
    };
  },
};
