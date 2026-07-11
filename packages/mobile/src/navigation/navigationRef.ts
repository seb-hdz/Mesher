import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Open chat for a known peer, or the Messages tab when peerId is missing. */
export function navigateToIncomingMessage(peerId: string | null | undefined): void {
  if (!navigationRef.isReady()) return;

  if (typeof peerId === "string" && peerId.length > 0) {
    navigationRef.navigate("Chat", { peerId });
    return;
  }

  navigationRef.navigate("Main", { screen: "Messages" });
}
