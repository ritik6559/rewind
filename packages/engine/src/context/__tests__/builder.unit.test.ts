import {
  type AssistantMessage,
  createEmptyUsage,
  type EventType,
  type NewEvent,
  newEventId,
  newQuestionId,
  newSessionId,
  type StoredEvent,
} from "@rewind/protocol";
import { describe, expect, it } from "vitest";
import { buildMessages } from "../builder.ts";

const sessionId = newSessionId();

function eventsOf(...newEvents: NewEvent[]): StoredEvent[] {
  return newEvents.map(
    (event, index) =>
      ({
        ...event,
        id: newEventId(),
        sessionId,
        seq: index + 1,
        ts: 0,
      }) as StoredEvent,
  );
}

function anEvent<T extends EventType>(
  type: T,
  payload: NewEvent<T>["payload"],
): NewEvent<T> {
  return { type, runId: null, causedByEventId: null, payload } as NewEvent<T>;
}

const assistantCalling = (
  toolCallId: string,
  toolName: string,
): AssistantMessage => ({
  role: "assistant",
  content: [{ type: "toolCall", toolCallId, toolName, input: {} }],
  api: "faux",
  provider: "faux",
  modelId: "faux",
  usage: createEmptyUsage(),
  stopReason: "toolUse",
});

describe("buildMessages", () => {
  it("turns a tool round trip into user, assistant and tool result messages", () => {
    const assistantMessage = assistantCalling("call_1", "shell_exec");

    const messages = buildMessages(
      eventsOf(
        anEvent("user.message_sent", { text: "Fix the test" }),
        anEvent("model.response_received", { assistantMessage, durationMs: 5 }),
        anEvent("tool.call_started", {
          toolCallId: "call_1",
          toolName: "shell_exec",
          input: {},
        }),
        anEvent("tool.call_finished", {
          toolCallId: "call_1",
          toolName: "shell_exec",
          isError: false,
          output: "ok",
          durationMs: 3,
        }),
      ),
    );

    expect(messages).toEqual([
      { role: "user", content: "Fix the test" },
      assistantMessage,
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "shell_exec",
        isError: false,
        content: [{ type: "text", text: "ok" }],
      },
    ]);
  });

  it("shows the model why a tool input was rejected", () => {
    const messages = buildMessages(
      eventsOf(
        anEvent("tool.input_rejected", {
          toolCallId: "call_1",
          toolName: "str_replace",
          validationError: "oldString must be non-empty",
        }),
      ),
    );

    expect(messages).toEqual([
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "str_replace",
        isError: true,
        content: [{ type: "text", text: "oldString must be non-empty" }],
      },
    ]);
  });

  it("answers the ask_user call with the user's answer", () => {
    const questionId = newQuestionId();

    const messages = buildMessages(
      eventsOf(
        anEvent("tool.call_started", {
          toolCallId: "call_7",
          toolName: "ask_user",
          input: { question: "Which file?" },
        }),
        anEvent("agent.question_asked", {
          questionId,
          question: "Which file?",
        }),
        anEvent("user.question_answered", { questionId, answer: "a.ts" }),
      ),
    );

    expect(messages).toEqual([
      {
        role: "toolResult",
        toolCallId: "call_7",
        toolName: "ask_user",
        isError: false,
        content: [{ type: "text", text: "a.ts" }],
      },
    ]);
  });

  it("treats an answer with no open ask_user call as a user message", () => {
    const messages = buildMessages(
      eventsOf(
        anEvent("user.question_answered", {
          questionId: newQuestionId(),
          answer: "a.ts",
        }),
      ),
    );

    expect(messages).toEqual([{ role: "user", content: "a.ts" }]);
  });

  it("ignores events the model does not need", () => {
    const messages = buildMessages(
      eventsOf(
        anEvent("run.started", { trigger: "user_message" }),
        anEvent("session.status_changed", { from: "idle", to: "running" }),
        anEvent("agent.message_sent", { text: "Done" }),
        anEvent("run.completed", { summary: "Done", stepCount: 1 }),
      ),
    );

    expect(messages).toEqual([]);
  });
});
