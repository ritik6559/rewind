import { type } from "arktype";
import { ToolCall } from "../tools/tools.scope.ts";
import { Usage } from "../usage/usage.scope.ts";
import { APIS, STOP_REASONS } from "./messages.data.ts";

export const Api = type.enumerated(...APIS);
export type Api = typeof Api.infer;

export const StopReason = type.enumerated(...STOP_REASONS);
export type StopReason = typeof StopReason.infer;

export const TextContent = type({ type: "'text'", text: "string" });
export type TextContent = typeof TextContent.infer;

export const ThinkingContent = type({
  type: "'thinking'",
  thinking: "string",
  "signature?": "string",
});
export type ThinkingContent = typeof ThinkingContent.infer;

export const ToolCallContent = ToolCall.merge({ type: "'toolCall'" });
export type ToolCallContent = typeof ToolCallContent.infer;

export const UserMessage = type({
  role: "'user'",
  content: type("string").or(TextContent.array()),
});
export type UserMessage = typeof UserMessage.infer;

export const AssistantMessage = type({
  role: "'assistant'",
  content: TextContent.or(ThinkingContent).or(ToolCallContent).array(),
  api: Api,
  provider: "string",
  modelId: "string",
  usage: Usage,
  stopReason: StopReason,
  "errorMessage?": "string",
});
export type AssistantMessage = typeof AssistantMessage.infer;

export const ToolResultMessage = type({
  role: "'toolResult'",
  toolCallId: "string",
  toolName: "string",
  content: TextContent.array(),
  isError: "boolean",
});
export type ToolResultMessage = typeof ToolResultMessage.infer;

export type Message = UserMessage | AssistantMessage | ToolResultMessage;
