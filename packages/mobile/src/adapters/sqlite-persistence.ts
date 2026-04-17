import {
  base64ToBytes,
  bytesToBase64,
  packetFromJson,
  packetToJson,
  type NetworkPacketJsonV1,
  type OutboundRecord,
  type PeerRecord,
  type PersistencePort,
} from "@mesher/domain";
import * as SQLite from "expo-sqlite";

export function openDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync("mesher.db");
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
}

export function createSqlitePersistence(db: SQLite.SQLiteDatabase): PersistencePort {
  return {
    async saveOutbound(record: OutboundRecord) {
      const payload = JSON.stringify(packetToJson(record.packet));
      await db.runAsync(
        `INSERT OR REPLACE INTO outbound (message_id, payload, status, created_at) VALUES (?, ?, ?, ?)`,
        record.messageId,
        payload,
        record.status,
        record.createdAtMs,
      );
    },
    async listPendingOutbound() {
      const rows = await db.getAllAsync<{ message_id: string; payload: string; status: string; created_at: number }>(
        `SELECT message_id, payload, status, created_at FROM outbound WHERE status = 'PENDING'`,
      );
      return rows.map((r) => ({
        messageId: r.message_id,
        packet: packetFromJson(JSON.parse(r.payload) as NetworkPacketJsonV1),
        status: r.status as OutboundRecord["status"],
        createdAtMs: r.created_at,
      }));
    },
    async listOutboundRecent(limit: number) {
      const rows = await db.getAllAsync<{ message_id: string; payload: string; status: string; created_at: number }>(
        `SELECT message_id, payload, status, created_at FROM outbound ORDER BY created_at DESC LIMIT ?`,
        Math.max(1, Math.min(100, limit)),
      );
      return rows.map((r) => ({
        messageId: r.message_id,
        packet: packetFromJson(JSON.parse(r.payload) as NetworkPacketJsonV1),
        status: r.status as OutboundRecord["status"],
        createdAtMs: r.created_at,
      }));
    },
    async updateOutboundStatus(messageId: string, status: OutboundRecord["status"]) {
      await db.runAsync(`UPDATE outbound SET status = ? WHERE message_id = ?`, status, messageId);
    },
    async getOutbound(messageId: string) {
      const row = await db.getFirstAsync<{ message_id: string; payload: string; status: string; created_at: number }>(
        `SELECT message_id, payload, status, created_at FROM outbound WHERE message_id = ?`,
        messageId,
      );
      if (!row) return null;
      return {
        messageId: row.message_id,
        packet: packetFromJson(JSON.parse(row.payload) as NetworkPacketJsonV1),
        status: row.status as OutboundRecord["status"],
        createdAtMs: row.created_at,
      };
    },
    async hasSeenMessage(messageId: string) {
      const row = await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM seen_messages WHERE message_id = ?`,
        messageId,
      );
      return (row?.c ?? 0) > 0;
    },
    async recordSeenMessage(messageId: string, ttlExpiresAtMs: number) {
      await db.runAsync(
        `INSERT OR REPLACE INTO seen_messages (message_id, expires_at) VALUES (?, ?)`,
        messageId,
        ttlExpiresAtMs,
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
        peer.pairedAtMs,
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
