import { parseEvent } from "@rewind/protocol";
import { describe, expect, it } from "vitest";
import { MEMORY_SESSION_ID } from "../index.ts";
import { aUserMessageEvent } from "./memory-runtime.fixture.ts";
import { MemoryRuntimeScenario } from "./memory-runtime.scenario.ts";

describe("memory event store", () => {
  it("gives each new event the next seq, starting at 1", () => {
    const scenario = MemoryRuntimeScenario.start();

    scenario.append(aUserMessageEvent());
    scenario.append(aUserMessageEvent());
    scenario.append(aUserMessageEvent());

    expect(scenario.observers.seqs()).toEqual([1, 2, 3]);
  });

  it("fills in the session id, a new event id and the time from the clock", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.advanceClock(1_500);

    const storedEvent = scenario.append(aUserMessageEvent());

    expect(storedEvent).toMatchObject({
      id: "00000000-0000-7000-8000-000000000001",
      sessionId: MEMORY_SESSION_ID,
      ts: 1_500,
    });
  });

  it("keeps the type, run id, cause and payload that it was given", () => {
    const scenario = MemoryRuntimeScenario.start();
    const runId = scenario.runtime.ids.newRunId();
    const first = scenario.append(aUserMessageEvent());

    const storedEvent = scenario.append(
      aUserMessageEvent({
        runId,
        causedByEventId: first.id,
        payload: { text: "Run the tests" },
      }),
    );

    expect(storedEvent).toMatchObject({
      type: "user.message_sent",
      runId,
      causedByEventId: first.id,
      payload: { text: "Run the tests" },
    });
  });

  it("makes events that parseEvent accepts", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.advanceClock(10);

    const storedEvent = scenario.append(
      aUserMessageEvent({ runId: scenario.runtime.ids.newRunId() }),
    );

    expect(parseEvent(storedEvent)).toEqual(storedEvent);
  });

  it("returns all events when no seq is given", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.append(aUserMessageEvent());
    scenario.append(aUserMessageEvent());

    expect(scenario.observers.allEvents()).toHaveLength(2);
  });

  it("returns only the events after the given seq", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.append(aUserMessageEvent());
    scenario.append(aUserMessageEvent());
    scenario.append(aUserMessageEvent());

    const laterSeqs = scenario.observers
      .eventsAfter(1)
      .map((event) => event.seq);

    expect(laterSeqs).toEqual([2, 3]);
  });

  it("returns no events when the seq is the last one", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.append(aUserMessageEvent());

    expect(scenario.observers.eventsAfter(1)).toEqual([]);
  });

  it("keeps its events when a caller changes the list that read returns", () => {
    const scenario = MemoryRuntimeScenario.start();
    scenario.append(aUserMessageEvent());

    const returnedEvents = scenario.observers.allEvents();
    returnedEvents.length = 0;

    expect(scenario.observers.allEvents()).toHaveLength(1);
  });
});
