import * as Crypto from "expo-crypto";
import type { SecureRandomPort } from "@mesher/domain";

export function createExpoRandom(): SecureRandomPort {
  return {
    randomBytes(length: number): Promise<Uint8Array> {
      return Crypto.getRandomBytesAsync(length).then((b) => new Uint8Array(b));
    },
  };
}
