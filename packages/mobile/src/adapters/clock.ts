import type { ClockPort } from "@mesher/domain";

export function createSystemClock(): ClockPort {
  return {
    nowMs: () => Date.now(),
  };
}
