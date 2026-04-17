import { base64ToBytes, bytesToBase64 } from "../encoding/base64.js";
import { NETWORK_PACKET_SCHEMA_VERSION, type NetworkPacketJsonV1, type NetworkPacketV1 } from "./v1.js";

const KEY_LEN = 32;
const SIG_LEN = 64;

function assertLen(name: string, b: Uint8Array, n: number): void {
  if (b.length !== n) throw new Error(`${name}: expected ${n} bytes, got ${b.length}`);
}

export function packetToJson(packet: NetworkPacketV1): NetworkPacketJsonV1 {
  assertLen("senderSignPublicKey", packet.senderSignPublicKey, KEY_LEN);
  assertLen("senderBoxPublicKey", packet.senderBoxPublicKey, KEY_LEN);
  assertLen("recipientBoxPublicKey", packet.recipientBoxPublicKey, KEY_LEN);
  assertLen("signature", packet.signature, SIG_LEN);
  return {
    schemaVersion: NETWORK_PACKET_SCHEMA_VERSION,
    messageId: packet.messageId,
    senderSignPublicKey: bytesToBase64(packet.senderSignPublicKey),
    senderBoxPublicKey: bytesToBase64(packet.senderBoxPublicKey),
    recipientBoxPublicKey: bytesToBase64(packet.recipientBoxPublicKey),
    ciphertext: bytesToBase64(packet.ciphertext),
    ttlExpiresAt: packet.ttlExpiresAt,
    hopCount: packet.hopCount,
    signature: bytesToBase64(packet.signature),
  };
}

export function packetFromJson(json: NetworkPacketJsonV1): NetworkPacketV1 {
  if (json.schemaVersion !== NETWORK_PACKET_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${json.schemaVersion}`);
  }
  const senderSignPublicKey = base64ToBytes(json.senderSignPublicKey);
  const senderBoxPublicKey = base64ToBytes(json.senderBoxPublicKey);
  const recipientBoxPublicKey = base64ToBytes(json.recipientBoxPublicKey);
  const signature = base64ToBytes(json.signature);
  const ciphertext = base64ToBytes(json.ciphertext);
  assertLen("senderSignPublicKey", senderSignPublicKey, KEY_LEN);
  assertLen("senderBoxPublicKey", senderBoxPublicKey, KEY_LEN);
  assertLen("recipientBoxPublicKey", recipientBoxPublicKey, KEY_LEN);
  assertLen("signature", signature, SIG_LEN);
  return {
    schemaVersion: NETWORK_PACKET_SCHEMA_VERSION,
    messageId: json.messageId,
    senderSignPublicKey,
    senderBoxPublicKey,
    recipientBoxPublicKey,
    ciphertext,
    ttlExpiresAt: json.ttlExpiresAt,
    hopCount: json.hopCount,
    signature,
  };
}

export function serializePacketToUtf8(packet: NetworkPacketV1): Uint8Array {
  const json = packetToJson(packet);
  return new TextEncoder().encode(JSON.stringify(json));
}

export function deserializePacketFromUtf8(bytes: Uint8Array): NetworkPacketV1 {
  const text = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(text) as NetworkPacketJsonV1;
  return packetFromJson(parsed);
}
