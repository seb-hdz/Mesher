/** Logical schema version carried on the wire. */
export const NETWORK_PACKET_SCHEMA_VERSION = 1 as const;

export type NetworkPacketSchemaVersion = typeof NETWORK_PACKET_SCHEMA_VERSION;

/** In-memory representation (binary fields). */
export type NetworkPacketV1 = {
  schemaVersion: NetworkPacketSchemaVersion;
  /** Unique id for deduplication (ULID/UUID string). */
  messageId: string;
  /** Ed25519 public key, 32 bytes — identifies sender for signature verification. */
  senderSignPublicKey: Uint8Array;
  /** Sender Curve25519 public key for NaCl box open, 32 bytes. */
  senderBoxPublicKey: Uint8Array;
  /** Recipient's Curve25519 public key for box crypto, 32 bytes (routing hint; visible on mesh). */
  recipientBoxPublicKey: Uint8Array;
  ciphertext: Uint8Array;
  /** Unix timestamp (ms) after which relays should drop the packet. */
  ttlExpiresAt: number;
  hopCount: number;
  /** Ed25519 signature over canonical signed bytes (see serialize). */
  signature: Uint8Array;
};

export type NetworkPacketJsonV1 = {
  schemaVersion: 1;
  messageId: string;
  senderSignPublicKey: string;
  senderBoxPublicKey: string;
  recipientBoxPublicKey: string;
  ciphertext: string;
  ttlExpiresAt: number;
  hopCount: number;
  signature: string;
};
