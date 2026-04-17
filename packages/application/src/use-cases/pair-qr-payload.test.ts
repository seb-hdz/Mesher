import { describe, expect, it } from "vitest";
import { parsePairQrPayloadFromJson } from "./pair-with-peer.js";

describe("parsePairQrPayloadFromJson", () => {
  it("accepts a well-formed v1 object", () => {
    const payload = {
      v: 1,
      displayName: "DJ",
      signPublicKey: "AA",
      boxPublicKey: "BB",
    };
    const parsed = parsePairQrPayloadFromJson(JSON.stringify(payload));
    expect(parsed).toEqual(payload);
  });

  it("rejects invalid JSON", () => {
    expect(() => parsePairQrPayloadFromJson("not json")).toThrow(/not valid JSON/);
  });

  it("rejects non-objects", () => {
    expect(() => parsePairQrPayloadFromJson("[]")).toThrow(/JSON object/);
    expect(() => parsePairQrPayloadFromJson("null")).toThrow(/JSON object/);
  });

  it("rejects wrong version", () => {
    expect(() =>
      parsePairQrPayloadFromJson(
        JSON.stringify({
          v: 2,
          displayName: "x",
          signPublicKey: "a",
          boxPublicKey: "b",
        }),
      ),
    ).toThrow(/version/);
  });

  it("rejects missing fields", () => {
    expect(() => parsePairQrPayloadFromJson(JSON.stringify({ v: 1 }))).toThrow(/displayName/);
  });
});
