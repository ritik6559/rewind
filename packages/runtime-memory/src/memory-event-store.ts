import type { Clock, EventStore, IdGenerator } from "@rewind/engine";
import type { SessionId, StoredEvent } from "@rewind/protocol";

export function createMemoryEventStore({
  sessionId,
  clock,
  ids,
}: {
  sessionId: SessionId;
  clock: Clock;
  ids: IdGenerator;
}): EventStore {
  const storedEvents: StoredEvent[] = [];
  return {
    append(event) {
      const storedEvent = {
        ...event,
        id: ids.newEventId(),
        sessionId,
        seq: storedEvents.length + 1,
        ts: clock.now(),
      };
      storedEvents.push(storedEvent as StoredEvent);
      return storedEvent;
    },
    read(afterSeq = 0) {
      return storedEvents.slice(afterSeq);
    },
  };
}
