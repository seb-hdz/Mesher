import { describe, expect, it } from "vitest";
import { StreamChunkAssembler } from "./gossip/stream-assembler.js";

describe("@mesher/application", () => {
  it("exposes StreamChunkAssembler", () => {
    expect(new StreamChunkAssembler()).toBeDefined();
  });
});
