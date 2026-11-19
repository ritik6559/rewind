import type { Api, Message } from "@rewind/protocol";

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
