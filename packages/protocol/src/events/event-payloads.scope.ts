import { type } from "arktype";
import { baseScope } from "../base.scope.ts";
import { AssistantMessage } from "../messages/messages.scope.ts";
import { SessionStatus } from "../session/session.scope.ts";
import { ToolCall, ToolResult } from "../tools/tools.scope.ts";
import { RUN_CANCELLERS, RUN_TRIGGERS } from "./events.data.ts";

export const eventPayloadSchemas = {
  "session.status_changed": type({
    from: SessionStatus,
    to: SessionStatus,
    "reason?": "string",
  }),

  "run.started": type({ trigger: type.enumerated(...RUN_TRIGGERS) }),
  "run.completed": baseScope.type({ summary: "string", stepCount: "count" }),
  "run.failed": type({ errorMessage: "string" }),
  "run.cancelled": type({ cancelledBy: type.enumerated(...RUN_CANCELLERS) }),

  "user.message_sent": type({ text: "string" }),
  "agent.message_sent": type({ text: "string" }),

  "model.request_sent": baseScope.type({
    provider: "string",
    modelId: "string",
    stepNumber: "count",
  }),
  "model.response_received": baseScope.type({
    assistantMessage: AssistantMessage,
    durationMs: "durationMs",
  }),

  "tool.call_started": ToolCall,
  "tool.input_rejected": type({
    toolCallId: "string",
    toolName: "string",
    validationError: "string",
  }),
  "tool.call_finished": ToolResult,

  "agent.question_asked": baseScope.type({
    questionId: "questionId",
    question: "string",
    "suggestedAnswers?": "string[]",
  }),
  "user.question_answered": baseScope.type({
    questionId: "questionId",
    answer: "string",
  }),
} as const;

export type EventType = keyof typeof eventPayloadSchemas;
export type EventPayload<T extends EventType> =
  (typeof eventPayloadSchemas)[T]["infer"];
