import type { PairQrPayloadV1 } from "@mesher/application";
import type { DeliveredIncomingMessage } from "@mesher/application";
import type { PeerRecord } from "@mesher/domain";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { AppState, type NativeEventSubscription, Platform } from "react-native";
import { getMeshRuntime, initMeshRuntime, type MeshRuntime } from "../mesh/meshRuntime";
import {
  buildConversationPreviews,
  CHAT_PAGE_SIZE,
  mergeMessagesForPeer,
  trimToNewestWindow,
  type ChatPeerState,
  type ConversationPreviewUi,
} from "../messages/buildConversation";
import { startMeshBackgroundRelay, stopMeshBackgroundRelay } from "../native/meshBackgroundRelay";
import {
  clearPendingSiriActions,
  clearScheduledSiriJob,
  getPendingSiriActions,
  getScheduledSiriJobs,
  isMesherSiriAvailable,
  updateSiriContacts,
} from "../native/mesherSiri";

const BG_RELAY_SECURE_KEY = "mesher_bg_relay_v1";
const DISPLAY_NAME_SECURE_KEY = "mesher_display_name_v1";
const SIRI_DRAIN_UNKNOWN_LABEL = "Unknown";

let siriAppStateSub: NativeEventSubscription | null = null;
let siriDrainInFlight = false;

function syncSiriContactsFromPeers(peers: PeerRecord[]): void {
  if (!isMesherSiriAvailable()) return;
  void updateSiriContacts(peers.map((p) => ({ id: p.id, displayName: p.displayName })));
}

async function latestBodyForPeer(rt: MeshRuntime, peerId: string): Promise<string> {
  const [inb, out] = await Promise.all([
    rt.getLatestInboundByPeer(peerId),
    rt.getLatestOutboundByPeer(peerId),
  ]);
  if (!inb && !out) return "";
  if (!inb) return out!.plaintextUtf8;
  if (!out) return inb.body;
  return inb.receivedAtMs >= out.createdAtMs ? inb.body : out.plaintextUtf8;
}

async function loadPreviewsFromRuntime(
  rt: MeshRuntime,
  peers: PeerRecord[],
  unknownLabel: string
): Promise<ConversationPreviewUi[]> {
  const activity = await rt.listConversationPeerActivity();
  const latestBodies = new Map<string, string>();
  await Promise.all(
    activity.map(async (a) => {
      latestBodies.set(a.peerId, await latestBodyForPeer(rt, a.peerId));
    })
  );
  return buildConversationPreviews(peers, activity, latestBodies, unknownLabel);
}

async function loadChatMessagesForPeer(
  rt: MeshRuntime,
  peerId: string,
  beforeMs?: number
): Promise<{ messages: ChatPeerState["messages"]; hasMoreOlder: boolean }> {
  const opts = { limit: CHAT_PAGE_SIZE, beforeMs };
  const [inbound, outbound] = await Promise.all([
    rt.listInboundByPeer(peerId, opts),
    rt.listOutboundByPeer(peerId, opts),
  ]);
  const merged = mergeMessagesForPeer(inbound, outbound);
  if (beforeMs != null) {
    const hasMoreOlder =
      inbound.length === CHAT_PAGE_SIZE || outbound.length === CHAT_PAGE_SIZE;
    return { messages: merged, hasMoreOlder };
  }
  const { messages, trimmed } = trimToNewestWindow(merged, CHAT_PAGE_SIZE);
  const hasMoreOlder =
    inbound.length === CHAT_PAGE_SIZE ||
    outbound.length === CHAT_PAGE_SIZE ||
    trimmed;
  return { messages, hasMoreOlder };
}

type MeshUiState = {
  ready: boolean;
  displayName: string;
  displayNameLoaded: boolean;
  backgroundRelayEnabled: boolean;
  peers: PeerRecord[];
  conversations: ConversationPreviewUi[];
  chatByPeer: Record<string, ChatPeerState>;
  neighborCount: number;
  lastGossipSent: number | null;
  error: string | undefined;
  init: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<void>;
  setBackgroundRelayEnabled: (enabled: boolean) => Promise<void>;
  refreshPeers: () => Promise<void>;
  refreshConversations: (unknownLabel: string) => Promise<void>;
  loadChatPage: (peerId: string) => Promise<void>;
  loadOlderChatMessages: (peerId: string) => Promise<void>;
  onMessageDelivered: (message: DeliveredIncomingMessage, unknownLabel?: string) => Promise<void>;
  runGossip: () => Promise<void>;
  pairFromScan: (qrJson: string) => Promise<void>;
  sendMessage: (peerId: string, body: string, unknownLabel: string) => Promise<boolean>;
  drainSiriQueues: (unknownLabel?: string) => Promise<void>;
  processScheduledSiriJob: (jobId: string, unknownLabel?: string) => Promise<void>;
  getPairingPayload: (displayName: string) => PairQrPayloadV1;
};

export const useMeshStore = create<MeshUiState>((set, get) => ({
  ready: false,
  displayName: "",
  displayNameLoaded: false,
  backgroundRelayEnabled: false,
  peers: [],
  conversations: [],
  chatByPeer: {},
  neighborCount: 0,
  lastGossipSent: null,
  error: undefined,

  init: async () => {
    try {
      console.log("[mesher:ui] init start");
      let bgRelay = false;
      let displayName = "";
      try {
        bgRelay = (await SecureStore.getItemAsync(BG_RELAY_SECURE_KEY)) === "1";
      } catch {
        /* ignore */
      }
      try {
        const storedName = await SecureStore.getItemAsync(DISPLAY_NAME_SECURE_KEY);
        if (storedName) displayName = storedName;
      } catch {
        /* ignore */
      }
      await initMeshRuntime((message) => {
        void get().onMessageDelivered(message);
      });
      const rt = getMeshRuntime();
      if (bgRelay && Platform.OS === "android") {
        try {
          await startMeshBackgroundRelay();
        } catch (e) {
          console.warn("Mesh background relay (FGS) failed to start:", e);
          await SecureStore.deleteItemAsync(BG_RELAY_SECURE_KEY).catch(() => {});
          bgRelay = false;
        }
      }
      const peers = await rt.refreshPeers();
      const neighborCount = (await rt.transport.getNeighbors()).length;
      console.log(
        `[mesher:ui] init done peerCount=${peers.length} neighborCount=${neighborCount} bgRelay=${bgRelay}`,
      );
      set({
        ready: true,
        displayName,
        displayNameLoaded: true,
        backgroundRelayEnabled: bgRelay,
        peers,
        neighborCount,
        lastGossipSent: null,
        error: undefined,
      });
      syncSiriContactsFromPeers(peers);
      if (Platform.OS === "ios" && isMesherSiriAvailable()) {
        if (!siriAppStateSub) {
          siriAppStateSub = AppState.addEventListener("change", (next) => {
            if (next === "active" && get().ready) {
              void get().drainSiriQueues();
            }
          });
        }
        void get().drainSiriQueues();
      }
    } catch (e) {
      console.error("[mesher:ui] init failed", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  saveDisplayName: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await SecureStore.setItemAsync(DISPLAY_NAME_SECURE_KEY, trimmed);
      set({ displayName: trimmed, error: undefined });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  setBackgroundRelayEnabled: async (enabled: boolean) => {
    try {
      if (enabled) {
        await SecureStore.setItemAsync(BG_RELAY_SECURE_KEY, "1");
        if (Platform.OS === "android") {
          await startMeshBackgroundRelay();
        }
      } else {
        await SecureStore.deleteItemAsync(BG_RELAY_SECURE_KEY);
        if (Platform.OS === "android") {
          await stopMeshBackgroundRelay();
        }
      }
      set({ backgroundRelayEnabled: enabled, error: undefined });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshPeers: async () => {
    try {
      console.log("[mesher:peers] refreshPeers start");
      const rt = getMeshRuntime();
      const peers = await rt.refreshPeers();
      const neighborCount = (await rt.transport.getNeighbors()).length;
      console.log(
        `[mesher:peers] refreshPeers done peerCount=${peers.length} neighborCount=${neighborCount}`,
      );
      set({ peers, neighborCount });
      syncSiriContactsFromPeers(peers);
    } catch (e) {
      console.error("[mesher:peers] refreshPeers error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshConversations: async (unknownLabel: string) => {
    try {
      const rt = getMeshRuntime();
      const conversations = await loadPreviewsFromRuntime(rt, get().peers, unknownLabel);
      set({ conversations });
    } catch (e) {
      console.error("[mesher:chat] refreshConversations error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadChatPage: async (peerId: string) => {
    try {
      const rt = getMeshRuntime();
      const { messages, hasMoreOlder } = await loadChatMessagesForPeer(rt, peerId);
      set((s) => ({
        chatByPeer: {
          ...s.chatByPeer,
          [peerId]: { messages, hasMoreOlder, loadingOlder: false },
        },
      }));
    } catch (e) {
      console.error("[mesher:chat] loadChatPage error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadOlderChatMessages: async (peerId: string) => {
    const current = get().chatByPeer[peerId];
    if (!current?.hasMoreOlder || current.loadingOlder) return;
    const oldest = current.messages[0]?.atMs;
    if (oldest == null) return;

    set((s) => ({
      chatByPeer: {
        ...s.chatByPeer,
        [peerId]: { ...current, loadingOlder: true },
      },
    }));

    try {
      const rt = getMeshRuntime();
      const { messages: older, hasMoreOlder } = await loadChatMessagesForPeer(
        rt,
        peerId,
        oldest
      );
      const existingIds = new Set(get().chatByPeer[peerId]?.messages.map((m) => m.messageId));
      const toPrepend = older.filter((m) => !existingIds.has(m.messageId));
      set((s) => {
        const prev = s.chatByPeer[peerId];
        if (!prev) return s;
        return {
          chatByPeer: {
            ...s.chatByPeer,
            [peerId]: {
              messages: [...toPrepend, ...prev.messages],
              hasMoreOlder,
              loadingOlder: false,
            },
          },
        };
      });
    } catch (e) {
      console.error("[mesher:chat] loadOlderChatMessages error", e);
      set((s) => ({
        chatByPeer: {
          ...s.chatByPeer,
          [peerId]: { ...s.chatByPeer[peerId]!, loadingOlder: false },
        },
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  },

  onMessageDelivered: async (message: DeliveredIncomingMessage, unknownLabel?: string) => {
    const peerId = message.senderPeerId;
    if (peerId) {
      const chatMsg = {
        messageId: message.messageId,
        direction: "in" as const,
        body: message.plaintext,
        atMs: Date.now(),
      };
      set((s) => {
        const prev = s.chatByPeer[peerId];
        const nextChat = prev
          ? {
              ...prev,
              messages: prev.messages.some((m) => m.messageId === message.messageId)
                ? prev.messages
                : [...prev.messages, chatMsg],
            }
          : undefined;
        return {
          chatByPeer: nextChat ? { ...s.chatByPeer, [peerId]: nextChat } : s.chatByPeer,
        };
      });
    }
    if (unknownLabel) {
      await get().refreshConversations(unknownLabel);
    }
  },

  runGossip: async () => {
    try {
      console.log("[mesher:ui] runGossip (manual) invoke");
      const rt = getMeshRuntime();
      const sent = await rt.runGossip();
      const neighborCount = (await rt.transport.getNeighbors()).length;
      console.log(`[mesher:ui] runGossip done lastGossipSent=${sent} neighborCount=${neighborCount}`);
      set({ lastGossipSent: sent, neighborCount, error: undefined });
    } catch (e) {
      console.error("[mesher:ui] runGossip error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  pairFromScan: async (qrJson: string) => {
    try {
      console.log(`[mesher:pair] pairFromScan start qrJsonLen=${qrJson.length}`);
      const rt = getMeshRuntime();
      const peer = await rt.pairFromQrJson(qrJson);
      console.log(
        `[mesher:pair] pairFromScan paired id=${peer.id} displayName=${peer.displayName}`,
      );
      await get().refreshPeers();
      console.log("[mesher:pair] pairFromScan done after refreshPeers");
    } catch (e) {
      console.error("[mesher:pair] pairFromScan error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  sendMessage: async (peerId: string, body: string, unknownLabel: string) => {
    const peer = get().peers.find((p) => p.id === peerId);
    if (!peer) {
      console.warn(`[mesher:send] sendMessage aborted peer not found peerId=${peerId}`);
      set({ error: "Peer not found" });
      return false;
    }
    try {
      console.log(
        `[mesher:send] sendMessage start peerId=${peerId} to=${peer.displayName} bodyLen=${body.length}`,
      );
      const rt = getMeshRuntime();
      const sent = await rt.sendToPeer(peer, body);
      await get().loadChatPage(peerId);
      await get().refreshConversations(unknownLabel);
      console.log(`[mesher:send] sendMessage done gossipSentCount=${sent}`);
      set({ lastGossipSent: sent, error: undefined });
      return true;
    } catch (e) {
      console.error("[mesher:send] sendMessage error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  drainSiriQueues: async (unknownLabel = SIRI_DRAIN_UNKNOWN_LABEL) => {
    if (Platform.OS !== "ios" || !isMesherSiriAvailable() || !get().ready) return;
    if (siriDrainInFlight) return;
    siriDrainInFlight = true;
    try {
      const actions = await getPendingSiriActions();
      const cleared: string[] = [];
      for (const action of actions) {
        const peer = get().peers.find((p) => p.id === action.peerId);
        if (!peer) {
          console.warn(
            `[mesher:siri] pending action skipped peer not found id=${action.id} peerId=${action.peerId}`,
          );
          // Drop orphaned actions so the queue cannot grow forever.
          cleared.push(action.id);
          continue;
        }
        const ok = await get().sendMessage(action.peerId, action.body, unknownLabel);
        if (ok) {
          cleared.push(action.id);
        } else {
          console.error(`[mesher:siri] pending action send failed id=${action.id}`);
        }
      }
      if (cleared.length > 0) {
        await clearPendingSiriActions(cleared);
      }

      const nowMs = Date.now();
      const jobs = await getScheduledSiriJobs();
      for (const job of jobs) {
        if (job.fireAt > nowMs) continue;
        await get().processScheduledSiriJob(job.id, unknownLabel);
      }
    } finally {
      siriDrainInFlight = false;
    }
  },

  processScheduledSiriJob: async (jobId: string, unknownLabel = SIRI_DRAIN_UNKNOWN_LABEL) => {
    if (Platform.OS !== "ios" || !isMesherSiriAvailable() || !get().ready) return;
    const jobs = await getScheduledSiriJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      console.warn(`[mesher:siri] scheduled job not found jobId=${jobId}`);
      return;
    }
    const peer = get().peers.find((p) => p.id === job.peerId);
    if (!peer) {
      console.warn(
        `[mesher:siri] scheduled job peer missing jobId=${jobId} peerId=${job.peerId}`,
      );
      await clearScheduledSiriJob(jobId);
      return;
    }
    const ok = await get().sendMessage(job.peerId, job.body, unknownLabel);
    if (ok) {
      await clearScheduledSiriJob(jobId);
      console.log(`[mesher:siri] scheduled job sent jobId=${jobId}`);
    } else {
      console.error(`[mesher:siri] scheduled job send failed jobId=${jobId}`);
    }
  },

  getPairingPayload: (displayName: string) =>
    getMeshRuntime().getPairingPayload(displayName),
}));
