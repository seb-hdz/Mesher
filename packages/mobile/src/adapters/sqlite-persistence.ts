import {
  base64ToBytes,
  bytesToBase64,
  packetFromJson,
  packetToJson,
  type ConversationPeerActivity,
  type InboundRecord,
  type MessagePageOpts,
  type NetworkPacketJsonV1,
  type OutboundRecord,
  type PeerRecord,
  type PersistencePort,
} from "@mesher/domain";
import * as SQLite from "expo-sqlite";
import { decryptMessageBody, encryptMessageBody } from "./messageAtRestCrypto";

type OutboundRow = {
  message_id: string;
  payload: string;
  status: string;
  created_at: number;
  body_cipher: string;
  recipient_peer_id: string | null;
};

type InboundRow = {
  message_id: string;
  body_cipher: string;
  sender_peer_id: string | null;
  sender_display_name: string;
  received_at: number;
};

export function openDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync("mesher.db");
}

async function columnExists(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

export async function initSqliteSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS peers (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      sign_pk TEXT NOT NULL,
      box_pk TEXT NOT NULL,
      paired_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbound (
      message_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS seen_messages (
      message_id TEXT PRIMARY KEY NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_seen_expires ON seen_messages(expires_at);
    CREATE INDEX IF NOT EXISTS idx_peers_box_pk ON peers(box_pk);
  `);

  if (!(await columnExists(db, "outbound", "body_cipher"))) {
    await db.execAsync(
      `ALTER TABLE outbound ADD COLUMN body_cipher TEXT NOT NULL DEFAULT ''`
    );
  }
  if (!(await columnExists(db, "outbound", "recipient_peer_id"))) {
    await db.execAsync(`ALTER TABLE outbound ADD COLUMN recipient_peer_id TEXT`);
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inbound_messages (
      message_id TEXT PRIMARY KEY NOT NULL,
      body_cipher TEXT NOT NULL,
      sender_peer_id TEXT,
      sender_display_name TEXT NOT NULL DEFAULT '',
      received_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inbound_peer_time
      ON inbound_messages(sender_peer_id, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_outbound_peer_time
      ON outbound(recipient_peer_id, created_at DESC);
  `);
}

async function mapOutboundRow(r: OutboundRow): Promise<OutboundRecord> {
  return {
    messageId: r.message_id,
    packet: packetFromJson(JSON.parse(r.payload) as NetworkPacketJsonV1),
    status: r.status as OutboundRecord["status"],
    createdAtMs: r.created_at,
    plaintextUtf8: await decryptMessageBody(r.body_cipher),
    recipientPeerId: r.recipient_peer_id ?? "",
  };
}

async function mapInboundRow(r: InboundRow): Promise<InboundRecord> {
  return {
    messageId: r.message_id,
    body: await decryptMessageBody(r.body_cipher),
    senderPeerId: r.sender_peer_id,
    senderDisplayName: r.sender_display_name,
    receivedAtMs: r.received_at,
  };
}

function pageLimit(limit: number): number {
  return Math.max(1, limit);
}

export function createSqlitePersistence(db: SQLite.SQLiteDatabase): PersistencePort {
  return {
    async saveOutbound(record: OutboundRecord) {
      const payload = JSON.stringify(packetToJson(record.packet));
      const body_cipher = await encryptMessageBody(record.plaintextUtf8);
      await db.runAsync(
        `INSERT OR REPLACE INTO outbound (message_id, payload, status, created_at, body_cipher, recipient_peer_id) VALUES (?, ?, ?, ?, ?, ?)`,
        record.messageId,
        payload,
        record.status,
        record.createdAtMs,
        body_cipher,
        record.recipientPeerId || null
      );
    },
    async listPendingOutbound() {
      const rows = await db.getAllAsync<OutboundRow>(
        `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id FROM outbound WHERE status = 'PENDING'`
      );
      return Promise.all(rows.map(mapOutboundRow));
    },
    async listOutboundRecent(limit: number) {
      const rows = await db.getAllAsync<OutboundRow>(
        `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id FROM outbound ORDER BY created_at DESC LIMIT ?`,
        pageLimit(limit)
      );
      return Promise.all(rows.map(mapOutboundRow));
    },
    async listOutboundByPeer(peerId: string, opts: MessagePageOpts) {
      const before = opts.beforeMs ?? null;
      const rows = await db.getAllAsync<OutboundRow>(
        before != null
          ? `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id
             FROM outbound WHERE recipient_peer_id = ? AND created_at < ?
             ORDER BY created_at DESC LIMIT ?`
          : `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id
             FROM outbound WHERE recipient_peer_id = ?
             ORDER BY created_at DESC LIMIT ?`,
        ...(before != null ? [peerId, before, pageLimit(opts.limit)] : [peerId, pageLimit(opts.limit)])
      );
      return Promise.all(rows.map(mapOutboundRow));
    },
    async getLatestOutboundByPeer(peerId: string) {
      const row = await db.getFirstAsync<OutboundRow>(
        `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id
         FROM outbound WHERE recipient_peer_id = ? ORDER BY created_at DESC LIMIT 1`,
        peerId
      );
      return row ? mapOutboundRow(row) : null;
    },
    async updateOutboundStatus(messageId: string, status: OutboundRecord["status"]) {
      await db.runAsync(`UPDATE outbound SET status = ? WHERE message_id = ?`, status, messageId);
    },
    async getOutbound(messageId: string) {
      const row = await db.getFirstAsync<OutboundRow>(
        `SELECT message_id, payload, status, created_at, body_cipher, recipient_peer_id FROM outbound WHERE message_id = ?`,
        messageId
      );
      return row ? mapOutboundRow(row) : null;
    },
    async saveInbound(record: InboundRecord) {
      const body_cipher = await encryptMessageBody(record.body);
      await db.runAsync(
        `INSERT OR REPLACE INTO inbound_messages (message_id, body_cipher, sender_peer_id, sender_display_name, received_at) VALUES (?, ?, ?, ?, ?)`,
        record.messageId,
        body_cipher,
        record.senderPeerId,
        record.senderDisplayName,
        record.receivedAtMs
      );
    },
    async listInboundByPeer(peerId: string, opts: MessagePageOpts) {
      const before = opts.beforeMs ?? null;
      const rows = await db.getAllAsync<InboundRow>(
        before != null
          ? `SELECT message_id, body_cipher, sender_peer_id, sender_display_name, received_at
             FROM inbound_messages WHERE sender_peer_id = ? AND received_at < ?
             ORDER BY received_at DESC LIMIT ?`
          : `SELECT message_id, body_cipher, sender_peer_id, sender_display_name, received_at
             FROM inbound_messages WHERE sender_peer_id = ?
             ORDER BY received_at DESC LIMIT ?`,
        ...(before != null ? [peerId, before, pageLimit(opts.limit)] : [peerId, pageLimit(opts.limit)])
      );
      return Promise.all(rows.map(mapInboundRow));
    },
    async getLatestInboundByPeer(peerId: string) {
      const row = await db.getFirstAsync<InboundRow>(
        `SELECT message_id, body_cipher, sender_peer_id, sender_display_name, received_at
         FROM inbound_messages WHERE sender_peer_id = ? ORDER BY received_at DESC LIMIT 1`,
        peerId
      );
      return row ? mapInboundRow(row) : null;
    },
    async listConversationPeerActivity(): Promise<ConversationPeerActivity[]> {
      const rows = await db.getAllAsync<{ peer_id: string; last_at: number }>(
        `SELECT peer_id, MAX(ts) AS last_at FROM (
           SELECT recipient_peer_id AS peer_id, created_at AS ts FROM outbound
             WHERE recipient_peer_id IS NOT NULL
           UNION ALL
           SELECT sender_peer_id AS peer_id, received_at AS ts FROM inbound_messages
             WHERE sender_peer_id IS NOT NULL
         ) GROUP BY peer_id ORDER BY last_at DESC`
      );
      return rows.map((r) => ({ peerId: r.peer_id, lastAtMs: r.last_at }));
    },
    async hasSeenMessage(messageId: string) {
      const row = await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM seen_messages WHERE message_id = ?`,
        messageId
      );
      return (row?.c ?? 0) > 0;
    },
    async recordSeenMessage(messageId: string, ttlExpiresAtMs: number) {
      await db.runAsync(
        `INSERT OR REPLACE INTO seen_messages (message_id, expires_at) VALUES (?, ?)`,
        messageId,
        ttlExpiresAtMs
      );
    },
    async purgeExpiredSeen(nowMs: number) {
      await db.runAsync(`DELETE FROM seen_messages WHERE expires_at < ?`, nowMs);
    },
    async savePeer(peer: PeerRecord) {
      await db.runAsync(
        `INSERT OR REPLACE INTO peers (id, display_name, sign_pk, box_pk, paired_at) VALUES (?, ?, ?, ?, ?)`,
        peer.id,
        peer.displayName,
        bytesToBase64(peer.signPublicKey),
        bytesToBase64(peer.boxPublicKey),
        peer.pairedAtMs
      );
    },
    async listPeers() {
      const rows = await db.getAllAsync<{
        id: string;
        display_name: string;
        sign_pk: string;
        box_pk: string;
        paired_at: number;
      }>(`SELECT id, display_name, sign_pk, box_pk, paired_at FROM peers ORDER BY paired_at DESC`);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.display_name,
        signPublicKey: base64ToBytes(r.sign_pk),
        boxPublicKey: base64ToBytes(r.box_pk),
        pairedAtMs: r.paired_at,
      }));
    },
    async getPeerByBoxPublicKey(boxPk: Uint8Array) {
      const want = bytesToBase64(boxPk);
      const r = await db.getFirstAsync<{
        id: string;
        display_name: string;
        sign_pk: string;
        box_pk: string;
        paired_at: number;
      }>(`SELECT id, display_name, sign_pk, box_pk, paired_at FROM peers WHERE box_pk = ?`, want);
      if (!r) return null;
      return {
        id: r.id,
        displayName: r.display_name,
        signPublicKey: base64ToBytes(r.sign_pk),
        boxPublicKey: base64ToBytes(r.box_pk),
        pairedAtMs: r.paired_at,
      };
    },
  };
}
