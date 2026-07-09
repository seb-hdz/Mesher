import type { NetworkPacketV1 } from "../packet/v1.js";

/** PENDING: queued; SENT: gossip broadcast completed; DELIVERED: recipient confirmed; EXPIRED: TTL purged. */
export type OutboundStatus = "PENDING" | "SENT" | "DELIVERED" | "EXPIRED";

export type OutboundRecord = {
  messageId: string;
  packet: NetworkPacketV1;
  status: OutboundStatus;
  createdAtMs: number;
  /** Plaintext body (in memory only; adapters encrypt at rest). */
  plaintextUtf8: string;
  recipientPeerId: string;
};

export type InboundRecord = {
  messageId: string;
  body: string;
  senderPeerId: string | null;
  senderDisplayName: string;
  receivedAtMs: number;
};

export type MessagePageOpts = {
  beforeMs?: number;
  limit: number;
};

export type ConversationPeerActivity = {
  peerId: string;
  lastAtMs: number;
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
  /** Newest first; for UI / diagnostics. */
  listOutboundRecent(limit: number): Promise<OutboundRecord[]>;
  listOutboundByPeer(peerId: string, opts: MessagePageOpts): Promise<OutboundRecord[]>;
  getLatestOutboundByPeer(peerId: string): Promise<OutboundRecord | null>;
  updateOutboundStatus(messageId: string, status: OutboundStatus): Promise<void>;
  getOutbound(messageId: string): Promise<OutboundRecord | null>;

  saveInbound(record: InboundRecord): Promise<void>;
  listInboundByPeer(peerId: string, opts: MessagePageOpts): Promise<InboundRecord[]>;
  getLatestInboundByPeer(peerId: string): Promise<InboundRecord | null>;
  listConversationPeerActivity(): Promise<ConversationPeerActivity[]>;

  hasSeenMessage(messageId: string): Promise<boolean>;
  recordSeenMessage(messageId: string, ttlExpiresAtMs: number): Promise<void>;
  purgeExpiredSeen(nowMs: number): Promise<void>;

  savePeer(peer: PeerRecord): Promise<void>;
  listPeers(): Promise<PeerRecord[]>;
  getPeerByBoxPublicKey(boxPk: Uint8Array): Promise<PeerRecord | null>;
}
