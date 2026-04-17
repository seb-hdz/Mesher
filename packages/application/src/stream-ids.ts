import type { StreamIdAllocator } from "./deps.js";

/** Inbound relay streams use 1..0x7fff; outbound gossip uses 0x8000..0xffff (domain framing). */
export function createStreamIdAllocator(): StreamIdAllocator {
  let inbound = 1;
  let outbound = 0x8000;

  return {
    nextInboundRelayStreamId(): number {
      inbound = (inbound + 1) & 0xffff;
      if (inbound === 0) inbound = 1;
      if (inbound >= 0x8000) inbound = 1;
      return inbound;
    },
    nextOutboundGossipStreamId(): number {
      outbound = (outbound + 1) & 0xffff;
      if (outbound === 0 || outbound < 0x8000) outbound = 0x8000;
      return outbound;
    },
  };
}
