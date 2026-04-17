import {
  createAssemblyState,
  pushChunk,
  readFragmentHeader,
  type AssemblyState,
} from "@mesher/domain";

/** Multiplex fragmented streams by `streamId` (see domain framing). */
export class StreamChunkAssembler {
  private readonly streams = new Map<number, AssemblyState>();

  /** Returns full payload when a stream completes; otherwise null. */
  accept(chunk: Uint8Array): Uint8Array | null {
    const meta = readFragmentHeader(chunk);
    if (!meta) return null;
    let st = this.streams.get(meta.streamId);
    if (!st) {
      st = createAssemblyState(meta.chunkCount);
      this.streams.set(meta.streamId, st);
    }
    if (st.chunkCount !== meta.chunkCount) {
      this.streams.delete(meta.streamId);
      return null;
    }
    const assembled = pushChunk(st, chunk);
    if (assembled) {
      this.streams.delete(meta.streamId);
    }
    return assembled;
  }

  clear(): void {
    this.streams.clear();
  }
}
