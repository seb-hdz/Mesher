import { describe, expect, it } from "vitest";
import { NETWORK_PACKET_SCHEMA_VERSION, type NetworkPacketV1 } from "../packet/v1.js";
import { canForward, isRecipient, withIncrementedHop } from "./forwarding.js";

function samplePacket(over: Partial<NetworkPacketV1> = {}): NetworkPacketV1 {
  const z = new Uint8Array(32);
  return {
    schemaVersion: NETWORK_PACKET_SCHEMA_VERSION,
    messageId: "msg-1",
    senderSignPublicKey: z,
    senderBoxPublicKey: z,
    recipientBoxPublicKey: z,
    ciphertext: new Uint8Array([1, 2, 3]),
    ttlExpiresAt: 9_999_999_999_999,
    hopCount: 0,
    signature: new Uint8Array(64),
    ...over,
  };
}

describe("canForward", () => {
  it("rejects expired", () => {
    const p = samplePacket({ ttlExpiresAt: 1000 });
    expect(canForward(p, { nowMs: 2000, seenMessageIds: new Set(), maxHopCount: 10 })).toBe(false);
  });

  it("rejects when hop at max", () => {
    const p = samplePacket({ hopCount: 10 });
    expect(canForward(p, { nowMs: 0, seenMessageIds: new Set(), maxHopCount: 10 })).toBe(false);
  });

  it("rejects duplicate id", () => {
    const p = samplePacket();
    expect(canForward(p, { nowMs: 0, seenMessageIds: new Set(["msg-1"]), maxHopCount: 10 })).toBe(
      false,
    );
  });

  it("accepts fresh packet", () => {
    const p = samplePacket();
    expect(canForward(p, { nowMs: 0, seenMessageIds: new Set(), maxHopCount: 10 })).toBe(true);
  });
});

describe("withIncrementedHop", () => {
  it("increments", () => {
    const p = samplePacket({ hopCount: 3 });
    const n = withIncrementedHop(p);
    expect(n.hopCount).toBe(4);
    expect(p.hopCount).toBe(3);
  });
});

describe("isRecipient", () => {
  it("matches box key", () => {
    const pk = new Uint8Array(32);
    pk[0] = 7;
    const p = samplePacket({ recipientBoxPublicKey: pk });
    expect(isRecipient(p, pk)).toBe(true);
    expect(isRecipient(p, new Uint8Array(32))).toBe(false);
  });
});
