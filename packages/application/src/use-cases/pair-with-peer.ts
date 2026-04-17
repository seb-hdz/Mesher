import { bytesToBase64, type PeerRecord } from "@mesher/domain";
import type { AppDeps } from "../deps.js";

export type PairQrPayloadV1 = {
  v: 1;
  displayName: string;
  signPublicKey: string;
  boxPublicKey: string;
};

const SIGN_PK_LEN = 32;
const BOX_PK_LEN = 32;

/** Parse and narrow QR JSON; throws with a clear message if the shape is wrong. */
export function parsePairQrPayloadFromJson(json: string): PairQrPayloadV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("QR payload is not valid JSON");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("QR payload must be a JSON object");
  }
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) throw new Error("Unsupported QR payload version");
  if (typeof o.displayName !== "string") throw new Error("QR payload missing displayName");
  if (typeof o.signPublicKey !== "string" || typeof o.boxPublicKey !== "string") {
    throw new Error("QR payload missing signPublicKey or boxPublicKey");
  }
  console.log(`[mesher:pair] QR JSON parsed v=1 displayName=${o.displayName}`);
  return {
    v: 1,
    displayName: o.displayName,
    signPublicKey: o.signPublicKey,
    boxPublicKey: o.boxPublicKey,
  };
}

export async function pairWithPeerFromQrPayload(
  deps: AppDeps,
  payload: PairQrPayloadV1,
  decodeB64: (s: string) => Uint8Array,
): Promise<PeerRecord> {
  if (payload.v !== 1) throw new Error("Unsupported QR payload version");
  let signPublicKey: Uint8Array;
  let boxPublicKey: Uint8Array;
  try {
    signPublicKey = decodeB64(payload.signPublicKey);
    boxPublicKey = decodeB64(payload.boxPublicKey);
  } catch {
    throw new Error("QR payload keys are not valid base64");
  }
  if (signPublicKey.length !== SIGN_PK_LEN || boxPublicKey.length !== BOX_PK_LEN) {
    throw new Error("QR payload keys have invalid length");
  }
  console.log(
    `[mesher:pair] keys decoded ok signLen=${signPublicKey.length} boxLen=${boxPublicKey.length} displayName=${payload.displayName}`,
  );
  const peer: PeerRecord = {
    id: bytesToBase64(boxPublicKey),
    displayName: payload.displayName,
    signPublicKey,
    boxPublicKey,
    pairedAtMs: deps.clock.nowMs(),
  };
  await deps.persistence.savePeer(peer);
  console.log(`[mesher:pair] peer saved id=${peer.id} displayName=${peer.displayName}`);
  return peer;
}
