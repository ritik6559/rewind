import type { NewEvent, ToolCall } from "@rewind/protocol";

export const aToolCall = (overrides: Partial<ToolCall> = {}): ToolCall => ({
  toolCallId: "call_1",
  toolName: "open_file",
  input: { path: "README.md" },
  ...overrides,
});

export const aUserMessageEvent = (
  overrides: Partial<NewEvent<"user.message_sent">> = {},
): NewEvent<"user.message_sent"> => ({
  type: "user.message_sent",
  runId: null,
  causedByEventId: null,
  payload: { text: "Fix the failing test" },
  ...overrides,
});
