import {
  NETWORK_PACKET_SCHEMA_VERSION,
  deserializePacketFromUtf8,
  serializePacketToUtf8,
  type NetworkPacketV1,
  type SecureRandomPort,
} from "@mesher/domain";
import type { AppDeps } from "../deps.js";

export type EnqueueOutgoingInput = {
  recipientBoxPublicKey: Uint8Array;
  recipientPeerId: string;
  plaintextUtf8: string;
  ttlMsFromNow: number;
  signSecretKey: Uint8Array;
  boxSecretKey: Uint8Array;
  senderSignPublicKey: Uint8Array;
  senderBoxPublicKey: Uint8Array;
};

/** Create ULID-like id without extra deps (simple time + random). */
async function newMessageId(random: SecureRandomPort, nowMs: number): Promise<string> {
  const t = nowMs.toString(36);
  const raw = await Promise.resolve(random.randomBytes(8));
  const r = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${t}-${r}`;
}

export async function enqueueOutgoingMessage(
  deps: AppDeps,
  input: EnqueueOutgoingInput,
): Promise<{ messageId: string; packet: NetworkPacketV1 }> {
  const ciphertext = await deps.crypto.sealUtf8(
    input.plaintextUtf8,
    input.recipientBoxPublicKey,
    input.boxSecretKey,
  );
  const now = deps.clock.nowMs();
  const messageId = await newMessageId(deps.random, now);
  const unsigned: Omit<NetworkPacketV1, "signature"> = {
    schemaVersion: NETWORK_PACKET_SCHEMA_VERSION,
    messageId,
    senderSignPublicKey: input.senderSignPublicKey,
    senderBoxPublicKey: input.senderBoxPublicKey,
    recipientBoxPublicKey: input.recipientBoxPublicKey,
    ciphertext,
    ttlExpiresAt: now + input.ttlMsFromNow,
    hopCount: 0,
  };
  const packet = await deps.crypto.signPacket(unsigned, input.signSecretKey);
  await deps.persistence.saveOutbound({
    messageId,
    packet,
    status: "PENDING",
    createdAtMs: now,
  });
  await deps.persistence.recordSeenMessage(messageId, packet.ttlExpiresAt);
  console.log(
    `[mesher:send] enqueued messageId=${messageId} recipientPeerId=${input.recipientPeerId} plaintextLen=${input.plaintextUtf8.length} ttlExpiresAt=${packet.ttlExpiresAt} status=PENDING`,
  );
  return { messageId, packet };
}

/** Deserialize after transport (for tests / handlers). */
export function parsePacketUtf8(bytes: Uint8Array): NetworkPacketV1 {
  return deserializePacketFromUtf8(bytes);
}

export { serializePacketToUtf8 };
