import type { IncomingChunkHandler, NeighborInfo, TransportPort } from "@mesher/domain";

/**
 * In-memory fan-out for development: every subscriber receives chunks from `broadcastChunk`.
 * Replace with `react-native-ble-plx` in a development build for on-device mesh tests.
 */
export class MockBleMeshTransport implements TransportPort {
  private handlers = new Set<IncomingChunkHandler>();
  private running = false;

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  subscribeIncoming(handler: IncomingChunkHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async broadcastChunk(chunk: Uint8Array): Promise<void> {
    if (!this.running) return;
    const copy = new Uint8Array(chunk);
    const handlers = [...this.handlers];
    for (const h of handlers) {
      try {
        await Promise.resolve(h(copy));
      } catch {
        /* keep notifying other subscribers */
      }
    }
  }

  async getNeighbors(): Promise<NeighborInfo[]> {
    return [
      {
        id: "mock-mesh",
        rssi: -42,
        lastSeenMs: Date.now(),
      },
    ];
  }
}
