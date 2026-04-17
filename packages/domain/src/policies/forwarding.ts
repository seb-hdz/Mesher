import type { NetworkPacketV1 } from "../packet/v1.js";

export type ForwardingContext = {
  nowMs: number;
  /** Message ids already held or seen (dedup). */
  seenMessageIds: ReadonlySet<string>;
  maxHopCount: number;
};

/** Whether this node may relay the packet to another peer. */
export function canForward(packet: NetworkPacketV1, ctx: ForwardingContext): boolean {
  if (packet.ttlExpiresAt <= ctx.nowMs) return false;
  if (packet.hopCount >= ctx.maxHopCount) return false;
  if (ctx.seenMessageIds.has(packet.messageId)) return false;
  return true;
}

/** After successful relay, increment hop (immutable — return new packet). */
export function withIncrementedHop(packet: NetworkPacketV1): NetworkPacketV1 {
  return { ...packet, hopCount: packet.hopCount + 1 };
}

/** True if this device is the intended recipient (compare box public keys). */
export function isRecipient(
  packet: NetworkPacketV1,
  localBoxPublicKey: Uint8Array,
): boolean {
  if (localBoxPublicKey.length !== packet.recipientBoxPublicKey.length) return false;
  return timingSafeEqual(localBoxPublicKey, packet.recipientBoxPublicKey);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
