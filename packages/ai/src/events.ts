import type { AssistantMessage, ToolCallContent } from "@rewind/protocol";

export type AssistantMessageEvent =
  | { type: "start" }
  | { type: "text_start"; contentIndex: number }
  | { type: "text_delta"; contentIndex: number; delta: string }
  | { type: "text_end"; contentIndex: number; text: string }
  | { type: "thinking_start"; contentIndex: number }
  | { type: "thinking_delta"; contentIndex: number; delta: string }
  | { type: "thinking_end"; contentIndex: number; thinking: string }
  | {
      type: "toolcall_start";
      contentIndex: number;
      toolCallId: string;
      toolName: string;
    }
  | { type: "toolcall_delta"; contentIndex: number; delta: string }
  | { type: "toolcall_end"; contentIndex: number; toolCall: ToolCallContent }
  | { type: "done"; message: AssistantMessage }
  | { type: "error"; message: AssistantMessage };

export type FinalAssistantMessageEvent = Extract<
  AssistantMessageEvent,
  { type: "done" | "error" }
>;

export function isFinalEvent(
  event: AssistantMessageEvent,
): event is FinalAssistantMessageEvent {
  return event.type === "done" || event.type === "error";
}
