import type { NetworkPacketV1 } from "../packet/v1.js";

/** PENDING: queued; SENT: gossip broadcast completed; DELIVERED: recipient confirmed; EXPIRED: TTL purged. */
export type OutboundStatus = "PENDING" | "SENT" | "DELIVERED" | "EXPIRED";

export type OutboundRecord = {
  messageId: string;
  packet: NetworkPacketV1;
  status: OutboundStatus;
  createdAtMs: number;
};

export type PeerRecord = {
  id: string;
  displayName: string;
  signPublicKey: Uint8Array;
  boxPublicKey: Uint8Array;
  pairedAtMs: number;
};

export interface PersistencePort {
  saveOutbound(record: OutboundRecord): Promise<void>;
  listPendingOutbound(): Promise<OutboundRecord[]>;
  /** Newest first; for UI outbox / diagnostics. */
  listOutboundRecent(limit: number): Promise<OutboundRecord[]>;
  updateOutboundStatus(messageId: string, status: OutboundStatus): Promise<void>;
  getOutbound(messageId: string): Promise<OutboundRecord | null>;

  hasSeenMessage(messageId: string): Promise<boolean>;
  recordSeenMessage(messageId: string, ttlExpiresAtMs: number): Promise<void>;
  purgeExpiredSeen(nowMs: number): Promise<void>;

  savePeer(peer: PeerRecord): Promise<void>;
  listPeers(): Promise<PeerRecord[]>;
  getPeerByBoxPublicKey(boxPk: Uint8Array): Promise<PeerRecord | null>;
}
