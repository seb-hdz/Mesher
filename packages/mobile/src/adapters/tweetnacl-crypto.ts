import { canonicalSignBytes, type CryptoPort, type NetworkPacketV1 } from "@mesher/domain";
import type { SecureRandomPort } from "@mesher/domain";
import * as ExpoCrypto from "expo-crypto";
import nacl from "tweetnacl";

/**
 * TweetNaCl defaults to throwing "no PRNG" when `crypto.getRandomValues` is missing (typical in RN).
 * Wire its internal RNG to Expo's synchronous CSPRNG before `nacl.sign/box.keyPair()` runs.
 */
nacl.setPRNG((out, n) => {
  out.set(ExpoCrypto.getRandomBytes(n));
});

function bodyForSign(packet: Omit<NetworkPacketV1, "signature">) {
  return {
    schemaVersion: packet.schemaVersion,
    messageId: packet.messageId,
    senderSignPublicKey: packet.senderSignPublicKey,
    senderBoxPublicKey: packet.senderBoxPublicKey,
    recipientBoxPublicKey: packet.recipientBoxPublicKey,
    ciphertext: packet.ciphertext,
    ttlExpiresAt: packet.ttlExpiresAt,
  };
}

export function createTweetNaclCrypto(random: SecureRandomPort): CryptoPort {
  return {
    async generateSignKeyPair() {
      const kp = nacl.sign.keyPair();
      return { publicKey: kp.publicKey, secretKey: kp.secretKey };
    },
    async generateBoxKeyPair() {
      const kp = nacl.box.keyPair();
      return { publicKey: kp.publicKey, secretKey: kp.secretKey };
    },
    async sign(message: Uint8Array, secretKey: Uint8Array) {
      return nacl.sign.detached(message, secretKey);
    },
    async verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) {
      return nacl.sign.detached.verify(message, signature, publicKey);
    },
    async sealUtf8(plaintext: string, recipientBoxPk: Uint8Array, senderBoxSk: Uint8Array) {
      const msg = new TextEncoder().encode(plaintext);
      const nonceRaw = await Promise.resolve(random.randomBytes(nacl.box.nonceLength));
      const nonce = nonceRaw.length === nacl.box.nonceLength ? nonceRaw : nonceRaw.subarray(0, nacl.box.nonceLength);
      const sender = nacl.box.keyPair.fromSecretKey(senderBoxSk);
      const boxed = nacl.box(msg, nonce, recipientBoxPk, sender.secretKey);
      const out = new Uint8Array(nonce.length + boxed.length);
      out.set(nonce, 0);
      out.set(boxed, nonce.length);
      return out;
    },
    async openUtf8(ciphertext: Uint8Array, senderBoxPk: Uint8Array, recipientBoxSk: Uint8Array) {
      const nonceLen = nacl.box.nonceLength;
      const nonce = ciphertext.subarray(0, nonceLen);
      const box = ciphertext.subarray(nonceLen);
      const recipient = nacl.box.keyPair.fromSecretKey(recipientBoxSk);
      const opened = nacl.box.open(box, nonce, senderBoxPk, recipient.secretKey);
      if (!opened) throw new Error("box open failed");
      return new TextDecoder().decode(opened);
    },
    async signPacket(unsigned: Omit<NetworkPacketV1, "signature">, signSk: Uint8Array) {
      const canonical = canonicalSignBytes(bodyForSign(unsigned));
      const signature = nacl.sign.detached(canonical, signSk);
      return { ...unsigned, signature };
    },
    async verifyPacket(packet: NetworkPacketV1) {
      const canonical = canonicalSignBytes(bodyForSign(packet));
      return nacl.sign.detached.verify(canonical, packet.signature, packet.senderSignPublicKey);
    },
  };
}
