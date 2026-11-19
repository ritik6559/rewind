import type { QuestionId, RunId, SessionStatus } from "@rewind/protocol";

type EngineErrorData = {
  RunAlreadyActive: { activeRunId: RunId };
  NotRunning: { status: SessionStatus };
  NotWaitingForAnswer: {
    answeredQuestionId: QuestionId;
    openQuestionId: QuestionId | null;
  };
};

export type EngineErrorCode = keyof EngineErrorData;

const messageFor: {
  [Code in EngineErrorCode]: (data: EngineErrorData[Code]) => string;
} = {
  RunAlreadyActive: ({ activeRunId }) =>
    `Run ${activeRunId} is still active. Stop it or wait for it to finish before starting a new run.`,
  NotRunning: ({ status }) =>
    `No run is active (the session is ${status}). Start a run first.`,
  NotWaitingForAnswer: ({ answeredQuestionId, openQuestionId }) =>
    openQuestionId
      ? `Question ${answeredQuestionId} is not the open question. Answer question ${openQuestionId}.`
      : `Question ${answeredQuestionId} is not open. The agent is not waiting for an answer.`,
};

export class EngineError<
  Code extends EngineErrorCode = EngineErrorCode,
> extends Error {
  readonly code: Code;
  readonly data: EngineErrorData[Code];

  constructor(code: Code, data: EngineErrorData[Code]) {
    super(messageFor[code](data));
    this.name = "EngineError";
    this.code = code;
    this.data = data;
  }
}

export function isEngineError<Code extends EngineErrorCode>(
  error: unknown,
  code: Code,
): error is EngineError<Code> {
  return error instanceof EngineError && error.code === code;
}

export function serializeErrorChain(error: unknown): unknown {
  return serializeErrorsNotYetSeen(error, new Set());
}

function serializeErrorsNotYetSeen(
  error: unknown,
  errorsAlreadySeen: Set<Error>,
): unknown {
  if (!(error instanceof Error)) return error;
  if (errorsAlreadySeen.has(error)) return "[Circular]";
  errorsAlreadySeen.add(error);
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: serializeErrorsNotYetSeen(error.cause, errorsAlreadySeen),
  };
}
