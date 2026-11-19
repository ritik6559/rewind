import { type } from "arktype";
import { SessionStatus } from "./session-state.ts";
import { ToolCall, ToolResult } from "./tool-io.ts";
import { Usage } from "./usage.ts";

export const StopReason = type(
  "'stop' | 'length' | 'toolUse' | 'error' | 'aborted'",
);
export type StopReason = typeof StopReason.infer;

export const eventPayloadSchemas = {
  "session.status_changed": type({
    from: SessionStatus,
    to: SessionStatus,
    "reason?": "string",
  }),

  "run.started": type({ trigger: "'user_message' | 'retry'" }),
  "run.completed": type({
    summary: "string",
    stepCount: "number.integer >= 0",
  }),
  "run.failed": type({ errorMessage: "string" }),
  "run.cancelled": type({ cancelledBy: "'user' | 'system'" }),

  "user.message_sent": type({ text: "string" }),
  "agent.message_sent": type({ text: "string" }),

  "model.request_sent": type({
    provider: "string",
    modelId: "string",
    stepNumber: "number.integer >= 0",
  }),
  "model.response_received": type({
    assistantMessage: "Record<string, unknown>",
    stopReason: StopReason,
    usage: Usage,
    durationMs: "number >= 0",
  }),

  "tool.call_started": ToolCall,
  "tool.input_rejected": type({
    toolCallId: "string",
    toolName: "string",
    validationErrors: "string",
  }),
  "tool.call_finished": ToolResult,

  "agent.question_asked": type({
    questionId: "string",
    question: "string",
    "suggestedAnswers?": "string[]",
  }),
  "user.question_answered": type({ questionId: "string", answer: "string" }),
} as const;

export type EventType = keyof typeof eventPayloadSchemas;
export type EventPayload<T extends EventType> =
  (typeof eventPayloadSchemas)[T]["infer"];
