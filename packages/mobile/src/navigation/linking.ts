import * as Linking from "expo-linking";
import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

const prefix = Linking.createURL("/");

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
          peerId: (peerId: string) => peerId,
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
};
