import type { StopReason, ToolCall, Usage } from "@rewind/protocol";

export type Api =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai"
  | "faux";

export type PricePerMillionTokens = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type Model = {
  id: string;
  provider: string;
  api: Api;
  baseUrl: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricePerMillionTokens: PricePerMillionTokens;
  supportsReasoning: boolean;
};

export type TextContent = { type: "text"; text: string };

export type ThinkingContent = {
  type: "thinking";
  thinking: string;
  signature?: string;
};

export type ToolCallContent = ToolCall & { type: "toolCall" };

export type UserMessage = {
  role: "user";
  content: string | TextContent[];
};

export type AssistantMessage = {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCallContent)[];
  api: Api;
  provider: string;
  modelId: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
};

export type ToolResultMessage = {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: TextContent[];
  isError: boolean;
};

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export type ToolSpec = {
  name: string;
  description: string;
  inputJsonSchema: Record<string, unknown>;
};

export type Context = {
  systemPrompt: string;
  messages: Message[];
  tools: ToolSpec[];
};
