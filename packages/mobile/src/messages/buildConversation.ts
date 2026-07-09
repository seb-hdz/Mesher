import type { OutboundStatus, PeerRecord } from "@mesher/domain";

export const CHAT_PAGE_SIZE = 100;

export type ChatMessageUi = {
  messageId: string;
  direction: "in" | "out";
  body: string;
  atMs: number;
  status?: OutboundStatus;
};

export type ConversationPreviewUi = {
  peerId: string;
  displayName: string;
  lastMessage: string;
  lastAtMs: number;
};

export type ChatPeerState = {
  messages: ChatMessageUi[];
  hasMoreOlder: boolean;
  loadingOlder: boolean;
};

export function mergeMessagesForPeer(
  inbound: { messageId: string; body: string; receivedAtMs: number }[],
  outbound: {
    messageId: string;
    plaintextUtf8: string;
    createdAtMs: number;
    status: OutboundStatus;
  }[]
): ChatMessageUi[] {
  const byId = new Map<string, ChatMessageUi>();

  for (const m of inbound) {
    byId.set(m.messageId, {
      messageId: m.messageId,
      direction: "in",
      body: m.body,
      atMs: m.receivedAtMs,
    });
  }
  for (const m of outbound) {
    byId.set(m.messageId, {
      messageId: m.messageId,
      direction: "out",
      body: m.plaintextUtf8,
      atMs: m.createdAtMs,
      status: m.status,
    });
  }

  return [...byId.values()].sort((a, b) => a.atMs - b.atMs);
}

/** Keep the newest `maxCount` messages from a chronologically sorted list. */
export function trimToNewestWindow(
  messages: ChatMessageUi[],
  maxCount: number
): { messages: ChatMessageUi[]; trimmed: boolean } {
  if (messages.length <= maxCount) {
    return { messages, trimmed: false };
  }
  return { messages: messages.slice(messages.length - maxCount), trimmed: true };
}

export function buildConversationPreviews(
  peers: PeerRecord[],
  activity: { peerId: string; lastAtMs: number }[],
  latestBodies: Map<string, string>,
  unknownLabel: string
): ConversationPreviewUi[] {
  const peerById = new Map(peers.map((p) => [p.id, p]));

  return activity
    .map((a) => {
      const peer = peerById.get(a.peerId);
      const displayName = peer?.displayName.trim() || unknownLabel;
      return {
        peerId: a.peerId,
        displayName,
        lastMessage: latestBodies.get(a.peerId) ?? "",
        lastAtMs: a.lastAtMs,
      };
    })
    .sort((a, b) => b.lastAtMs - a.lastAtMs);
}
