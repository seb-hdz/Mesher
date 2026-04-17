import type { PairQrPayloadV1 } from "@mesher/application";
import type { OutboundRecord, PeerRecord } from "@mesher/domain";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { Platform } from "react-native";
import { getMeshRuntime, initMeshRuntime, type MeshRuntime } from "../mesh/meshRuntime";
import { startMeshBackgroundRelay, stopMeshBackgroundRelay } from "../native/meshBackgroundRelay";

export type OutboundRowUi = {
  messageId: string;
  status: OutboundRecord["status"];
  createdAtMs: number;
  toDisplayName: string;
};

function boxKeyEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function buildOutboundRows(rt: MeshRuntime, peers: PeerRecord[]): Promise<OutboundRowUi[]> {
  const rows = await rt.listOutboundRecent(20);
  return rows.map((r) => {
    const peer = peers.find((p) => boxKeyEqual(p.boxPublicKey, r.packet.recipientBoxPublicKey));
    return {
      messageId: r.messageId,
      status: r.status,
      createdAtMs: r.createdAtMs,
      toDisplayName: peer?.displayName ?? "unknown contact",
    };
  });
}

const BG_RELAY_SECURE_KEY = "mesher_bg_relay_v1";

type MeshUiState = {
  ready: boolean;
  displayName: string;
  backgroundRelayEnabled: boolean;
  peers: PeerRecord[];
  inbox: string[];
  outbound: OutboundRowUi[];
  neighborCount: number;
  lastGossipSent: number | null;
  error: string | undefined;
  init: () => Promise<void>;
  setDisplayName: (name: string) => void;
  setBackgroundRelayEnabled: (enabled: boolean) => Promise<void>;
  refreshPeers: () => Promise<void>;
  runGossip: () => Promise<void>;
  pairFromScan: (qrJson: string) => Promise<void>;
  sendMessage: (peerId: string, body: string) => Promise<void>;
  getPairingPayload: (displayName: string) => PairQrPayloadV1;
};

export const useMeshStore = create<MeshUiState>((set, get) => ({
  ready: false,
  displayName: "Raver",
  backgroundRelayEnabled: false,
  peers: [],
  inbox: [],
  outbound: [],
  neighborCount: 0,
  lastGossipSent: null,
  error: undefined,

  init: async () => {
    try {
      console.log("[mesher:ui] init start");
      let bgRelay = false;
      try {
        bgRelay = (await SecureStore.getItemAsync(BG_RELAY_SECURE_KEY)) === "1";
      } catch {
        /* ignore */
      }
      await initMeshRuntime((text) => {
        set((s) => ({ inbox: [text, ...s.inbox] }));
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
      const outbound = await buildOutboundRows(rt, peers);
      console.log(
        `[mesher:ui] init done peerCount=${peers.length} neighborCount=${neighborCount} outboundRows=${outbound.length} bgRelay=${bgRelay}`,
      );
      set({
        ready: true,
        backgroundRelayEnabled: bgRelay,
        peers,
        outbound,
        neighborCount,
        lastGossipSent: null,
        error: undefined,
      });
    } catch (e) {
      console.error("[mesher:ui] init failed", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  setDisplayName: (name: string) => set({ displayName: name }),

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
      const outbound = await buildOutboundRows(rt, peers);
      console.log(
        `[mesher:peers] refreshPeers done peerCount=${peers.length} neighborCount=${neighborCount} outboundRows=${outbound.length}`,
      );
      set({ peers, neighborCount, outbound });
    } catch (e) {
      console.error("[mesher:peers] refreshPeers error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  runGossip: async () => {
    try {
      console.log("[mesher:ui] runGossip (manual) invoke");
      const rt = getMeshRuntime();
      const sent = await rt.runGossip();
      const outbound = await buildOutboundRows(rt, get().peers);
      const neighborCount = (await rt.transport.getNeighbors()).length;
      console.log(`[mesher:ui] runGossip done lastGossipSent=${sent} neighborCount=${neighborCount}`);
      set({ lastGossipSent: sent, outbound, neighborCount, error: undefined });
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

  sendMessage: async (peerId: string, body: string) => {
    const peer = get().peers.find((p) => p.id === peerId);
    if (!peer) {
      console.warn(`[mesher:send] sendMessage aborted peer not found peerId=${peerId}`);
      set({ error: "Peer not found" });
      return;
    }
    try {
      console.log(
        `[mesher:send] sendMessage start peerId=${peerId} to=${peer.displayName} bodyLen=${body.length}`,
      );
      const rt = getMeshRuntime();
      const sent = await rt.sendToPeer(peer, body);
      const outbound = await buildOutboundRows(rt, get().peers);
      console.log(
        `[mesher:send] sendMessage done gossipSentCount=${sent} outboundRows=${outbound.length}`,
      );
      set({ lastGossipSent: sent, outbound, error: undefined });
    } catch (e) {
      console.error("[mesher:send] sendMessage error", e);
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  getPairingPayload: (displayName: string) =>
    getMeshRuntime().getPairingPayload(displayName),
}));
