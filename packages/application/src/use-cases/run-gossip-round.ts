import { fragmentBuffer, serializePacketToUtf8 } from "@mesher/domain";
import type { AppDeps } from "../deps.js";

/**
 * Push undelivered outbound packets to the transport (fragmented).
 * Retries PENDING and SENT until TTL expires (marks EXPIRED) or status becomes DELIVERED.
 */
export async function runGossipRound(deps: AppDeps): Promise<{ sent: number }> {
  const pending = await deps.persistence.listPendingOutbound();
  const now = deps.clock.nowMs();
  console.log(`[mesher:gossip] round start undeliveredOutbound=${pending.length}`);
  let sent = 0;
  for (const rec of pending) {
    if (rec.status !== "PENDING" && rec.status !== "SENT") continue;

    if (rec.packet.ttlExpiresAt <= now) {
      await deps.persistence.updateOutboundStatus(rec.messageId, "EXPIRED");
      console.log(
        `[mesher:gossip] messageId=${rec.messageId} status->EXPIRED ttlExpiresAt=${rec.packet.ttlExpiresAt}`,
      );
      continue;
    }

    const raw = serializePacketToUtf8(rec.packet);
    const sid = deps.streamIds.nextOutboundGossipStreamId();
    const chunks = fragmentBuffer(raw, deps.mtu, sid);
    console.log(
      `[mesher:gossip] broadcasting messageId=${rec.messageId} priorStatus=${rec.status} streamId=${sid} chunkCount=${chunks.length} rawUtf8Len=${raw.byteLength}`,
    );
    for (const c of chunks) {
      await deps.transport.broadcastChunk(c);
    }
    if (rec.status !== "SENT") {
      await deps.persistence.updateOutboundStatus(rec.messageId, "SENT");
    }
    sent++;
    console.log(`[mesher:gossip] messageId=${rec.messageId} status->SENT`);
  }
  console.log(`[mesher:gossip] round done sent=${sent}`);
  return { sent };
}
