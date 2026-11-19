import { scope, type } from "arktype";

export const baseScope = scope({
  count: "number.integer >= 0",
  durationMs: "number >= 0",
  epochMs: "number.integer >= 0",
  seq: type("number.integer >= 1").configure({
    description: "the 1-based position of the event in its session",
  }),
  eventId: "string.uuid.v7#EventId",
  sessionId: "string.uuid.v7#SessionId",
  runId: "string.uuid.v7#RunId",
  questionId: "string.uuid.v7#QuestionId",
});
