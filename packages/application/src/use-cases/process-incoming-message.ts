import {
  canForward,
  deserializePacketFromUtf8,
  isRecipient,
  serializePacketToUtf8,
  withIncrementedHop,
  fragmentBuffer,
  type NetworkPacketV1,
} from "@mesher/domain";
import type { AppDeps } from "../deps.js";
import { StreamChunkAssembler } from "../gossip/stream-assembler.js";

/** Title for message preview when sender is not in local peer list (or has no display name). */
const UNKNOWN_SENDER_PREVIEW_TITLE = "Desconocido";

export type LocalIdentity = {
  boxPublicKey: Uint8Array;
  boxSecretKey: Uint8Array;
};

export type ProcessIncomingResult =
  | { kind: "ignored" }
  | { kind: "assembled_invalid" }
  | { kind: "delivered"; plaintext: string; messageId: string }
  | { kind: "relayed"; messageId: string };

export function createIncomingHandler(deps: AppDeps, identity: LocalIdentity) {
  const assembler = new StreamChunkAssembler();

  return async function onChunk(
    chunk: Uint8Array
  ): Promise<ProcessIncomingResult> {
    const assembled = assembler.accept(chunk);
    if (!assembled) return { kind: "ignored" };

    let packet: NetworkPacketV1;
    try {
      packet = deserializePacketFromUtf8(assembled);
    } catch {
      console.log("[mesher:rx] assembled_invalid reason=deserialize");
      return { kind: "assembled_invalid" };
    }

    const ok = await deps.crypto.verifyPacket(packet);
    if (!ok) {
      console.log(
        `[mesher:rx] assembled_invalid reason=verify messageId=${packet.messageId}`
      );
      return { kind: "assembled_invalid" };
    }

    const now = deps.clock.nowMs();
    console.log(
      `[mesher:rx] packet ok messageId=${packet.messageId} hopCount=${packet.hopCount} cipherLen=${packet.ciphertext.byteLength}`
    );

    if (isRecipient(packet, identity.boxPublicKey)) {
      try {
        const plaintext = await deps.crypto.openUtf8(
          packet.ciphertext,
          packet.senderBoxPublicKey,
          identity.boxSecretKey
        );
        await deps.persistence.recordSeenMessage(
          packet.messageId,
          packet.ttlExpiresAt
        );
        await deps.persistence
          .updateOutboundStatus(packet.messageId, "DELIVERED")
          .catch(() => {
            /* not our outbound */
          });
        const senderPeer = await deps.persistence.getPeerByBoxPublicKey(
          packet.senderBoxPublicKey
        );
        const trimmedName = senderPeer?.displayName.trim();
        const previewTitle = !!trimmedName?.length
          ? trimmedName
          : UNKNOWN_SENDER_PREVIEW_TITLE;
        await deps.notifications.showLocalMessagePreview(
          previewTitle,
          plaintext.slice(0, 120)
        );
        console.log(
          `[mesher:rx] delivered messageId=${packet.messageId} plaintextLen=${plaintext.length}`
        );
        return { kind: "delivered", plaintext, messageId: packet.messageId };
      } catch {
        console.log(
          `[mesher:rx] assembled_invalid reason=decrypt messageId=${packet.messageId}`
        );
        return { kind: "assembled_invalid" };
      }
    }

    const seen = await deps.persistence.hasSeenMessage(packet.messageId);
    if (seen) {
      console.log(
        `[mesher:rx] ignored reason=already_seen messageId=${packet.messageId}`
      );
      return { kind: "ignored" };
    }

    const ctx = {
      nowMs: now,
      seenMessageIds: new Set<string>(),
      maxHopCount: deps.maxHopCount,
    };
    if (!canForward(packet, ctx)) {
      console.log(
        `[mesher:rx] ignored reason=cannot_forward messageId=${packet.messageId} hopCount=${packet.hopCount}`
      );
      return { kind: "ignored" };
    }

    await deps.persistence.recordSeenMessage(
      packet.messageId,
      packet.ttlExpiresAt
    );
    const relay = withIncrementedHop(packet);
    const raw = serializePacketToUtf8(relay);
    const sid = deps.streamIds.nextInboundRelayStreamId();
    const chunks = fragmentBuffer(raw, deps.mtu, sid);
    console.log(
      `[mesher:rx] relaying messageId=${packet.messageId} priorHop=${packet.hopCount} nextHop=${relay.hopCount} streamId=${sid} chunkCount=${chunks.length}`
    );
    for (const c of chunks) {
      await deps.transport.broadcastChunk(c);
    }
    return { kind: "relayed", messageId: packet.messageId };
  };
}
