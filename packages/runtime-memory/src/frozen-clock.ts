import type { Clock } from "@rewind/engine";

export type FrozenClock = Clock & { advance(ms: number): void };

export function createFrozenClock(startMs = 0): FrozenClock {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    advance(ms) {
      nowMs += ms;
    },
  };
}
