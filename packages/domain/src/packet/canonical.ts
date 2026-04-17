import type { NetworkPacketV1 } from "./v1.js";
import { utf8Bytes } from "./utf8.js";

/**
 * Bytes that are signed / verified.
 * Excludes `hopCount` so relays can increment hops without invalidating the origin signature.
 */
export function canonicalSignBytes(packet: Omit<NetworkPacketV1, "signature" | "hopCount">): Uint8Array {
  const parts: Uint8Array[] = [
    utf8Bytes("MESHER/v1\0"),
    new Uint8Array([packet.schemaVersion & 0xff]),
    utf8Bytes(packet.messageId),
    new Uint8Array([0]),
    packet.senderSignPublicKey,
    new Uint8Array([0]),
    packet.senderBoxPublicKey,
    new Uint8Array([0]),
    packet.recipientBoxPublicKey,
    new Uint8Array([0]),
    packet.ciphertext,
    new Uint8Array([0]),
    utf8Bytes(String(packet.ttlExpiresAt)),
  ];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
