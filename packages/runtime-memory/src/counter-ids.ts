import type { IdGenerator } from "@rewind/engine";
import { baseScope } from "@rewind/protocol";

const { eventId, runId, questionId, sessionId } = baseScope.export();

const counterUuid = (count: number) =>
  `00000000-0000-7000-8000-${count.toString(16).padStart(12, "0")}`;

export const MEMORY_SESSION_ID = sessionId.assert(counterUuid(0));

export function createCounterIds(): IdGenerator {
  let count = 0;
  const next = () => {
    count += 1;
    return counterUuid(count);
  };
  return {
    newEventId: () => eventId.assert(next()),
    newRunId: () => runId.assert(next()),
    newQuestionId: () => questionId.assert(next()),
  };
}
