import type { MemoryRuntime } from "../index.ts";

export class MemoryRuntimeObservers {
  private readonly runtime: MemoryRuntime;

  constructor(runtime: MemoryRuntime) {
    this.runtime = runtime;
  }

  allEvents() {
    return this.runtime.events.read();
  }

  eventsAfter(seq: number) {
    return this.runtime.events.read(seq);
  }

  seqs() {
    return this.allEvents().map((event) => event.seq);
  }

  toolCallsReceived() {
    return this.runtime.sandbox.calls;
  }
}
