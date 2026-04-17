import type {
  ClockPort,
  CryptoPort,
  NotificationPort,
  PersistencePort,
  SecureRandomPort,
  TransportPort,
} from "@mesher/domain";

export type StreamIdAllocator = {
  nextInboundRelayStreamId(): number;
  nextOutboundGossipStreamId(): number;
};

export type AppDeps = {
  clock: ClockPort;
  random: SecureRandomPort;
  crypto: CryptoPort;
  persistence: PersistencePort;
  transport: TransportPort;
  notifications: NotificationPort;
  streamIds: StreamIdAllocator;
  /** Max hops for gossip relay. */
  maxHopCount: number;
  /** BLE-ish MTU for chunking (bytes per chunk including header). */
  mtu: number;
};
