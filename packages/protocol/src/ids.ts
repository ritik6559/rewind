import { v7 as uuidv7 } from "uuid";
import { baseScope } from "./base.scope.ts";

const { eventId, sessionId, runId, questionId } = baseScope.export();

export type EventId = typeof eventId.infer;
export type SessionId = typeof sessionId.infer;
export type RunId = typeof runId.infer;
export type QuestionId = typeof questionId.infer;

export const newEventId = (): EventId => eventId.assert(uuidv7());
export const newSessionId = (): SessionId => sessionId.assert(uuidv7());
export const newRunId = (): RunId => runId.assert(uuidv7());
export const newQuestionId = (): QuestionId => questionId.assert(uuidv7());
