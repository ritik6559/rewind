import type { Api, Message, ToolSpec } from "@rewind/protocol";

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

export type Context = {
  systemPrompt: string;
  messages: Message[];
  tools: ToolSpec[];
};
