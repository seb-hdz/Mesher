import type { AppDeps } from "@mesher/application";
import {
  createIncomingHandler,
  createStreamIdAllocator,
  enqueueOutgoingMessage,
  pairWithPeerFromQrPayload,
  parsePairQrPayloadFromJson,
  purgeExpired,
  runGossipRound,
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
  type OutboundRecord,
  type PeerRecord,
  type TransportPort,
} from "@mesher/domain";
import type * as SQLite from "expo-sqlite";

const MAX_HOP = 12;
const MTU = 180;

export type MeshRuntime = {
  deps: AppDeps;
  identity: DeviceIdentity;
  db: SQLite.SQLiteDatabase;
  transport: TransportPort;
  dispose: () => void;
  refreshPeers: () => Promise<PeerRecord[]>;
  listOutboundRecent: (limit: number) => Promise<OutboundRecord[]>;
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

export async function initMeshRuntime(onDelivered: (text: string) => void): Promise<MeshRuntime> {
  if (instance) {
    console.log("[mesher:init] early-return (already initialized)");
    return instance;
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
      onDelivered(r.plaintext);
    }
  };

  const unsub = transport.subscribeIncoming(wrapped);
  console.log("[mesher:init] step=subscribeIncoming ok; calling transport.start (BLE/native on device)");
  await transport.start();
  console.log("[mesher:init] step=transport.start ok");

  console.log("[mesher:init] step=purgeExpired begin");
  await purgeExpired(deps);
  console.log("[mesher:init] step=purgeExpired ok");

  const dispose = () => {
    unsub();
    void transport.stop();
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
  return instance;
}
