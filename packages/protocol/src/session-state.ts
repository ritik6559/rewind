import { type } from "arktype";
import { createEmptyUsage, type Usage } from "./usage.ts";

export const SessionStatus = type(
  "'idle' | 'running' | 'waiting_for_user' | 'error'",
);
export type SessionStatus = typeof SessionStatus.infer;

export type WaitingFor = { kind: "question"; questionId: string };

export type SessionState = {
  status: SessionStatus;
  activeRunId: string | null;
  waitingFor: WaitingFor | null;
  lastSequenceNumber: number;
  totalUsage: Usage;
};

export function createInitialSessionState(): SessionState {
  return {
    status: "idle",
    activeRunId: null,
    waitingFor: null,
    lastSequenceNumber: 0,
    totalUsage: createEmptyUsage(),
  };
}
