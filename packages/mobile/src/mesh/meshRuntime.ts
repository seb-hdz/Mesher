import type { AppDeps } from "@mesher/application";
import {
  createIncomingHandler,
  createStreamIdAllocator,
  enqueueOutgoingMessage,
  pairWithPeerFromQrPayload,
  parsePairQrPayloadFromJson,
  purgeExpired,
  runGossipRound,
  type DeliveredIncomingMessage,
  type PairQrPayloadV1,
} from "@mesher/application";
import { loadOrCreateIdentity, type DeviceIdentity } from "../identity/secureIdentity";
import { createSystemClock } from "../adapters/clock";
import { createExpoRandom } from "../adapters/random";
import { createTweetNaclCrypto } from "../adapters/tweetnacl-crypto";
import { createSqlitePersistence, initSqliteSchema, openDb } from "../adapters/sqlite-persistence";
import {
  createMessageNotifications,
  setupMessageNotificationInfra,
} from "../adapters/notifications";
import { createMeshTransport } from "./createMeshTransport";
import {
  base64ToBytes,
  bytesToBase64,
  type ConversationPeerActivity,
  type InboundRecord,
  type MessagePageOpts,
  type OutboundRecord,
  type PeerRecord,
  type TransportPort,
} from "@mesher/domain";
import type * as SQLite from "expo-sqlite";

const MAX_HOP = 12;
const MTU = 180;
/** Re-broadcast undelivered outbound while peers may be offline / reconnecting. */
const GOSSIP_INTERVAL_MS = 30_000;

export type MeshRuntime = {
  deps: AppDeps;
  identity: DeviceIdentity;
  db: SQLite.SQLiteDatabase;
  transport: TransportPort;
  dispose: () => Promise<void>;
  refreshPeers: () => Promise<PeerRecord[]>;
  listOutboundRecent: (limit: number) => Promise<OutboundRecord[]>;
  listOutboundByPeer: (peerId: string, opts: MessagePageOpts) => Promise<OutboundRecord[]>;
  listInboundByPeer: (peerId: string, opts: MessagePageOpts) => Promise<InboundRecord[]>;
  getLatestOutboundByPeer: (peerId: string) => Promise<OutboundRecord | null>;
  getLatestInboundByPeer: (peerId: string) => Promise<InboundRecord | null>;
  listConversationPeerActivity: () => Promise<ConversationPeerActivity[]>;
  runGossip: () => Promise<number>;
  sendToPeer: (peer: PeerRecord, text: string) => Promise<number>;
  pairFromQrJson: (json: string) => Promise<PeerRecord>;
  getPairingPayload: (displayName: string) => PairQrPayloadV1;
};

let instance: MeshRuntime | null = null;

export function getMeshRuntime(): MeshRuntime {
  if (!instance) throw new Error("Mesh runtime not initialized");
  return instance;
}

export async function disposeMeshRuntime(): Promise<void> {
  if (!instance) return;
  const db = instance.db;
  await instance.dispose();
  try {
    await db.closeAsync();
  } catch {
    /* ignore */
  }
}

export type InitMeshResult = {
  runtime: MeshRuntime;
  /** Set when BLE/radio failed to start; local persistence is still available. */
  transportError?: unknown;
};

export async function initMeshRuntime(
  onDelivered: (message: DeliveredIncomingMessage) => void
): Promise<InitMeshResult> {
  if (instance) {
    console.log("[mesher:init] early-return (already initialized)");
    return { runtime: instance };
  }

  console.log("[mesher:init] enter");
  const clock = createSystemClock();
  const random = createExpoRandom();
  const crypto = createTweetNaclCrypto(random);
  console.log("[mesher:init] step=adapters-sync ok");

  const identity = await loadOrCreateIdentity(crypto);
  console.log("[mesher:init] step=loadOrCreateIdentity ok");

  const db = await openDb();
  console.log("[mesher:init] step=openDb ok");
  await initSqliteSchema(db);
  console.log("[mesher:init] step=initSqliteSchema ok");

  const persistence = createSqlitePersistence(db);
  const transport = createMeshTransport(identity.signPublicKey);
  await setupMessageNotificationInfra();
  const notifications = createMessageNotifications();
  console.log("[mesher:init] step=transport+deps-build ok (subscribe next)");

  const deps: AppDeps = {
    clock,
    random,
    crypto,
    persistence,
    transport,
    notifications,
    streamIds: createStreamIdAllocator(),
    maxHopCount: MAX_HOP,
    mtu: MTU,
  };

  const onChunk = createIncomingHandler(deps, {
    boxPublicKey: identity.boxPublicKey,
    boxSecretKey: identity.boxSecretKey,
  });

  const wrapped = async (chunk: Uint8Array) => {
    const r = await onChunk(chunk);
    if (r.kind !== "ignored") {
      console.log(
        `[mesher:rx] transport->handler chunkLen=${chunk.byteLength} result=${r.kind}`,
      );
    }
    if (r.kind === "delivered") {
      onDelivered(r.message);
    }
  };

  const unsub = transport.subscribeIncoming(wrapped);
  console.log("[mesher:init] step=subscribeIncoming ok; calling transport.start (BLE/native on device)");
  let transportError: unknown;
  try {
    await transport.start();
    console.log("[mesher:init] step=transport.start ok");
  } catch (e) {
    transportError = e;
    console.error("[mesher:init] step=transport.start failed (continuing with local data)", e);
  }

  console.log("[mesher:init] step=purgeExpired begin");
  await purgeExpired(deps);
  console.log("[mesher:init] step=purgeExpired ok");

  let gossipTimer: ReturnType<typeof setInterval> | null = null;
  if (!transportError) {
    gossipTimer = setInterval(() => {
      void (async () => {
        try {
          const { sent } = await runGossipRound(deps);
          if (sent > 0) {
            console.log(`[mesher:gossip] periodic round sent=${sent}`);
          }
        } catch (e) {
          console.warn("[mesher:gossip] periodic round failed", e);
        }
      })();
    }, GOSSIP_INTERVAL_MS);
  }

  const dispose = async () => {
    if (gossipTimer != null) {
      clearInterval(gossipTimer);
      gossipTimer = null;
    }
    unsub();
    await transport.stop();
    instance = null;
  };

  instance = {
    deps,
    identity,
    db,
    transport,
    dispose,
    refreshPeers: () => persistence.listPeers(),
    listOutboundRecent: (limit: number) => persistence.listOutboundRecent(limit),
    listOutboundByPeer: (peerId, opts) => persistence.listOutboundByPeer(peerId, opts),
    listInboundByPeer: (peerId, opts) => persistence.listInboundByPeer(peerId, opts),
    getLatestOutboundByPeer: (peerId) => persistence.getLatestOutboundByPeer(peerId),
    getLatestInboundByPeer: (peerId) => persistence.getLatestInboundByPeer(peerId),
    listConversationPeerActivity: () => persistence.listConversationPeerActivity(),
    runGossip: async () => (await runGossipRound(deps)).sent,
    sendToPeer: async (peer, text) => {
      await enqueueOutgoingMessage(deps, {
        recipientBoxPublicKey: peer.boxPublicKey,
        recipientPeerId: peer.id,
        plaintextUtf8: text,
        ttlMsFromNow: 2 * 60 * 60 * 1000,
        signSecretKey: identity.signSecretKey,
        boxSecretKey: identity.boxSecretKey,
        senderSignPublicKey: identity.signPublicKey,
        senderBoxPublicKey: identity.boxPublicKey,
      });
      return (await runGossipRound(deps)).sent;
    },
    pairFromQrJson: async (json: string) => {
      const payload = parsePairQrPayloadFromJson(json);
      return pairWithPeerFromQrPayload(deps, payload, base64ToBytes);
    },
    getPairingPayload: (name: string): PairQrPayloadV1 => ({
      v: 1,
      displayName: name,
      signPublicKey: bytesToBase64(identity.signPublicKey),
      boxPublicKey: bytesToBase64(identity.boxPublicKey),
    }),
  };

  console.log("[mesher:init] complete (instance assigned)");
  return { runtime: instance, transportError };
}
