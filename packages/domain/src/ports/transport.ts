export type NeighborInfo = {
  id: string;
  rssi?: number;
  lastSeenMs: number;
};

/** Sync or async handler; adapters should await promises so errors surface in tests. */
export type IncomingChunkHandler = (chunk: Uint8Array) => void | Promise<void>;

/**
 * Opaque transport (BLE today). Delivers raw chunks; framing / packet assembly lives in application layer.
 */
export interface TransportPort {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Unsubscribe returned function. */
  subscribeIncoming(handler: IncomingChunkHandler): () => void;
  /** Send one framed chunk to mesh / broadcast. */
  broadcastChunk(chunk: Uint8Array): Promise<void>;
  getNeighbors(): Promise<NeighborInfo[]>;
}
