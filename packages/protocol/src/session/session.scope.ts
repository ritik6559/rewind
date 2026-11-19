import { type } from "arktype";
import type { QuestionId, RunId } from "../ids.ts";
import { createEmptyUsage, type Usage } from "../usage/usage.scope.ts";
import { SESSION_STATUSES } from "./session.data.ts";

export const SessionStatus = type.enumerated(...SESSION_STATUSES);
export type SessionStatus = typeof SessionStatus.infer;

export type WaitingFor = { kind: "question"; questionId: QuestionId };

export type SessionState = {
  status: SessionStatus;
  activeRunId: RunId | null;
  waitingFor: WaitingFor | null;
  lastSeq: number;
  totalUsage: Usage;
};

export function createInitialSessionState(): SessionState {
  return {
    status: "idle",
    activeRunId: null,
    waitingFor: null,
    lastSeq: 0,
    totalUsage: createEmptyUsage(),
  };
}
