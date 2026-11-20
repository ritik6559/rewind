import { stream } from "@rewind/ai";
import type { Runtime } from "@rewind/engine";
import { createCounterIds, MEMORY_SESSION_ID } from "./counter-ids.ts";
import { createFakeSandbox, type FakeTool } from "./fake-sandbox.ts";
import { createFrozenClock } from "./frozen-clock.ts";
import { createMemoryEventStore } from "./memory-event-store.ts";

export { MEMORY_SESSION_ID } from "./counter-ids.ts";
export type { FakeTool, FakeToolResult } from "./fake-sandbox.ts";
export type { FrozenClock } from "./frozen-clock.ts";

export function createMemoryRuntime(
  toolsByName: Record<string, FakeTool> = {},
) {
  const clock = createFrozenClock();
  const ids = createCounterIds();
  return {
    events: createMemoryEventStore({
      sessionId: MEMORY_SESSION_ID,
      clock,
      ids,
    }),
    sandbox: createFakeSandbox(toolsByName),
    streamModel: stream,
    clock,
    ids,
  } satisfies Runtime;
}

export type MemoryRuntime = ReturnType<typeof createMemoryRuntime>;
