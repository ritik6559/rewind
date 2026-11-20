import type { EventType, NewEvent, ToolCall } from "@rewind/protocol";
import {
  createMemoryRuntime,
  type FakeTool,
  type MemoryRuntime,
} from "../index.ts";
import { MemoryRuntimeObservers } from "./memory-runtime.observers.ts";

export class MemoryRuntimeScenario {
  readonly runtime: MemoryRuntime;
  readonly observers: MemoryRuntimeObservers;

  private constructor(runtime: MemoryRuntime) {
    this.runtime = runtime;
    this.observers = new MemoryRuntimeObservers(runtime);
  }

  static start(toolsByName: Record<string, FakeTool> = {}) {
    return new MemoryRuntimeScenario(createMemoryRuntime(toolsByName));
  }

  append<T extends EventType>(event: NewEvent<T>) {
    return this.runtime.events.append(event);
  }

  callTool(toolCall: ToolCall, signal = new AbortController().signal) {
    return this.runtime.sandbox.callTool(toolCall, signal);
  }

  advanceClock(ms: number) {
    this.runtime.clock.advance(ms);
  }
}
