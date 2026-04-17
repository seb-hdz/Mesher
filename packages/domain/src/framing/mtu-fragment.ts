import { utf8Bytes, utf8String } from "../packet/utf8.js";

const MAGIC = 0x4d45; // 'ME'
const HEADER = 10;

export type FragmentHeader = {
  streamId: number;
  chunkIndex: number;
  chunkCount: number;
  payloadLength: number;
};

/** Parse header after magic. */
export function readFragmentHeader(chunk: Uint8Array): FragmentHeader | null {
  if (chunk.length < HEADER) return null;
  const magic = (chunk[0]! << 8) | chunk[1]!;
  if (magic !== MAGIC) return null;
  const streamId = (chunk[2]! << 8) | chunk[3]!;
  const chunkIndex = (chunk[4]! << 8) | chunk[5]!;
  const chunkCount = (chunk[6]! << 8) | chunk[7]!;
  const payloadLength = (chunk[8]! << 8) | chunk[9]!;
  if (chunkCount === 0 || chunkIndex >= chunkCount) return null;
  if (chunk.length !== HEADER + payloadLength) return null;
  return { streamId, chunkIndex, chunkCount, payloadLength };
}

function writeHeader(
  streamId: number,
  chunkIndex: number,
  chunkCount: number,
  payloadLen: number,
): Uint8Array {
  const h = new Uint8Array(HEADER);
  h[0] = (MAGIC >> 8) & 255;
  h[1] = MAGIC & 255;
  h[2] = (streamId >> 8) & 255;
  h[3] = streamId & 255;
  h[4] = (chunkIndex >> 8) & 255;
  h[5] = chunkIndex & 255;
  h[6] = (chunkCount >> 8) & 255;
  h[7] = chunkCount & 255;
  h[8] = (payloadLen >> 8) & 255;
  h[9] = payloadLen & 255;
  return h;
}

/**
 * Split payload into BLE-friendly chunks. `maxChunkSize` includes the header.
 * `streamId` correlates chunks when multiple transfers overlap (uint16).
 */
export function fragmentBuffer(
  buffer: Uint8Array,
  maxChunkSize: number,
  streamId: number,
): Uint8Array[] {
  if (maxChunkSize <= HEADER) {
    throw new Error("maxChunkSize must be greater than header");
  }
  const payloadMax = maxChunkSize - HEADER;
  const chunkCount = Math.max(1, Math.ceil(buffer.length / payloadMax));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * payloadMax;
    const end = Math.min(start + payloadMax, buffer.length);
    const payload = buffer.subarray(start, end);
    const header = writeHeader(streamId & 0xffff, i, chunkCount, payload.length);
    const chunk = new Uint8Array(HEADER + payload.length);
    chunk.set(header, 0);
    chunk.set(payload, HEADER);
    chunks.push(chunk);
  }
  return chunks;
}

export type AssemblyState = {
  chunkCount: number;
  payloads: (Uint8Array | undefined)[];
  received: number;
};

export function createAssemblyState(chunkCount: number): AssemblyState {
  return {
    chunkCount,
    payloads: new Array(chunkCount),
    received: 0,
  };
}

/** Returns assembled buffer when complete, otherwise null. */
export function pushChunk(state: AssemblyState, chunk: Uint8Array): Uint8Array | null {
  const meta = readFragmentHeader(chunk);
  if (!meta) return null;
  if (meta.chunkCount !== state.chunkCount) return null;
  const payload = chunk.subarray(HEADER);
  if (payload.length !== meta.payloadLength) return null;
  if (state.payloads[meta.chunkIndex] !== undefined) return null;
  state.payloads[meta.chunkIndex] = payload;
  state.received++;
  if (state.received < state.chunkCount) return null;
  const total = state.payloads.reduce((a, p) => a + (p?.length ?? 0), 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of state.payloads) {
    if (!p) return null;
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Optional envelope: UTF-8 JSON `{ "v":1, "id": "..." }` for correlating chunks in logs. */
export function fragmentEnvelopeLabel(id: string): Uint8Array {
  return utf8Bytes(JSON.stringify({ v: 1, id }));
}

export function parseEnvelopeLabel(bytes: Uint8Array): string | null {
  try {
    const j = JSON.parse(utf8String(bytes)) as { v?: number; id?: string };
    if (j.v === 1 && typeof j.id === "string") return j.id;
  } catch {
    /* ignore */
  }
  return null;
}
