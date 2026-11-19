import { type AssistantMessage, createEmptyUsage } from "@rewind/protocol";
import type { Adapter } from "../stream.ts";
import type { Model } from "../types.ts";

export type FauxReply = {
  thinking?: string;
  text?: string;
  toolCalls?: { toolName: string; input: Record<string, unknown> }[];
  error?: string;
};

const repliesByModel = new WeakMap<Model, FauxReply[]>();

export function createFauxModel(replies: FauxReply[]): Model {
  const model: Model = {
    id: "faux",
    provider: "faux",
    api: "faux",
    baseUrl: "",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    pricePerMillionTokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    supportsReasoning: true,
  };
  repliesByModel.set(model, [...replies]);
  return model;
}

export const fauxAdapter: Adapter = async (
  model,
  _context,
  options,
  events,
) => {
  if (options.signal?.aborted) throw new Error("Request aborted");
  const reply = repliesByModel.get(model)?.shift();
  if (!reply) throw new Error("Faux model has no replies left");
  if (reply.error) throw new Error(reply.error);

  const content: AssistantMessage["content"] = [];
  events.push({ type: "start" });

  if (reply.thinking) {
    const contentIndex = content.length;
    content.push({ type: "thinking", thinking: reply.thinking });
    events.push({ type: "thinking_start", contentIndex });
    events.push({
      type: "thinking_delta",
      contentIndex,
      delta: reply.thinking,
    });
    events.push({
      type: "thinking_end",
      contentIndex,
      thinking: reply.thinking,
    });
  }

  if (reply.text) {
    const contentIndex = content.length;
    content.push({ type: "text", text: reply.text });
    events.push({ type: "text_start", contentIndex });
    events.push({ type: "text_delta", contentIndex, delta: reply.text });
    events.push({ type: "text_end", contentIndex, text: reply.text });
  }

  for (const call of reply.toolCalls ?? []) {
    const contentIndex = content.length;
    const toolCall = {
      type: "toolCall" as const,
      toolCallId: crypto.randomUUID(),
      ...call,
    };
    content.push(toolCall);
    events.push({
      type: "toolcall_start",
      contentIndex,
      toolCallId: toolCall.toolCallId,
      toolName: call.toolName,
    });
    events.push({
      type: "toolcall_delta",
      contentIndex,
      delta: JSON.stringify(call.input),
    });
    events.push({ type: "toolcall_end", contentIndex, toolCall });
  }

  events.push({
    type: "done",
    message: {
      role: "assistant",
      content,
      api: model.api,
      provider: model.provider,
      modelId: model.id,
      usage: createEmptyUsage(),
      stopReason: reply.toolCalls?.length ? "toolUse" : "stop",
    },
  });
};
