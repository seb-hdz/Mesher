import { describe, expect, it } from "vitest";
import {
  createAssemblyState,
  fragmentBuffer,
  pushChunk,
  serializePacketToUtf8,
} from "../index.js";
import { NETWORK_PACKET_SCHEMA_VERSION, type NetworkPacketV1 } from "../packet/v1.js";

function tinyPacket(): NetworkPacketV1 {
  const k = new Uint8Array(32);
  return {
    schemaVersion: NETWORK_PACKET_SCHEMA_VERSION,
    messageId: "id",
    senderSignPublicKey: k,
    senderBoxPublicKey: k,
    recipientBoxPublicKey: k,
    ciphertext: new Uint8Array(10).fill(9),
    ttlExpiresAt: 1,
    hopCount: 0,
    signature: new Uint8Array(64),
  };
}

describe("fragmentBuffer + assembly", () => {
  it("roundtrips serialized packet through small MTU", () => {
    const raw = serializePacketToUtf8(tinyPacket());
    const chunks = fragmentBuffer(raw, 32, 1);
    expect(chunks.length).toBeGreaterThan(1);
    const state = createAssemblyState(chunks.length);
    let assembled: Uint8Array | null = null;
    for (const c of chunks) {
      assembled = pushChunk(state, c);
    }
    expect(assembled).not.toBeNull();
    expect(assembled!.length).toBe(raw.length);
    expect(Array.from(assembled!)).toEqual(Array.from(raw));
  });
});
