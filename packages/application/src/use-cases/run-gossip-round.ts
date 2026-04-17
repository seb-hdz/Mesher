import { fragmentBuffer, serializePacketToUtf8 } from "@mesher/domain";
import type { AppDeps } from "../deps.js";

/** Push pending outbound packets to the transport (fragmented); marks each as SENT after a full broadcast. */
export async function runGossipRound(deps: AppDeps): Promise<{ sent: number }> {
  const pending = await deps.persistence.listPendingOutbound();
  const pendingCount = pending.filter((r) => r.status === "PENDING").length;
  console.log(`[mesher:gossip] round start pendingOutbound=${pendingCount}`);
  let sent = 0;
  for (const rec of pending) {
    if (rec.status !== "PENDING") continue;
    const raw = serializePacketToUtf8(rec.packet);
    const sid = deps.streamIds.nextOutboundGossipStreamId();
    const chunks = fragmentBuffer(raw, deps.mtu, sid);
    console.log(
      `[mesher:gossip] broadcasting messageId=${rec.messageId} streamId=${sid} chunkCount=${chunks.length} rawUtf8Len=${raw.byteLength}`,
    );
    for (const c of chunks) {
      await deps.transport.broadcastChunk(c);
    }
    await deps.persistence.updateOutboundStatus(rec.messageId, "SENT");
    sent++;
    console.log(`[mesher:gossip] messageId=${rec.messageId} status->SENT`);
  }
  console.log(`[mesher:gossip] round done sent=${sent}`);
  return { sent };
}
