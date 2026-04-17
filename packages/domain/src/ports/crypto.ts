import type { NetworkPacketV1 } from "../packet/v1.js";

export type SignKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type BoxKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

/** NaCl-compatible box + Ed25519 signing (implementations: TweetNaCl adapter in app). */
export interface CryptoPort {
  generateSignKeyPair(): Promise<SignKeyPair>;
  generateBoxKeyPair(): Promise<BoxKeyPair>;

  sign(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array>;
  verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;

  /** Encrypt plaintext UTF-8 string for recipient's box public key. */
  sealUtf8(plaintext: string, recipientBoxPk: Uint8Array, senderBoxSk: Uint8Array): Promise<Uint8Array>;
  /** Decrypt box ciphertext from known sender's box public key. */
  openUtf8(ciphertext: Uint8Array, senderBoxPk: Uint8Array, recipientBoxSk: Uint8Array): Promise<string>;

  /** Build signed network packet (computes canonical bytes + sign). */
  signPacket(packetUnsigned: Omit<NetworkPacketV1, "signature">, signSk: Uint8Array): Promise<NetworkPacketV1>;
  verifyPacket(packet: NetworkPacketV1): Promise<boolean>;
}
