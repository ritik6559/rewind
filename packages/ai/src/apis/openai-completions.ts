import {
  type AssistantMessage,
  createEmptyUsage,
  type StopReason,
  type TextContent,
  type ToolCallContent,
} from "@rewind/protocol";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { calculateCost } from "../cost.ts";
import type { Adapter } from "../stream.ts";
import type { Context } from "../types.ts";

const stopReasons: Record<string, StopReason> = {
  stop: "stop",
  length: "length",
  tool_calls: "toolUse",
};

export const openaiCompletionsAdapter: Adapter = async (
  model,
  context,
  options,
  events,
) => {
  const client = new OpenAI({
    apiKey: options.apiKey ?? "none",
    baseURL: model.baseUrl,
  });

  const params: ChatCompletionCreateParamsStreaming = {
    model: model.id,
    messages: toOpenAIMessages(context),
    stream: true,
    stream_options: { include_usage: true },
  };

  if (context.tools.length > 0) {
    params.tools = context.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputJsonSchema,
      },
    }));
  }
  if (options.maxOutputTokens) {
    params.max_completion_tokens = options.maxOutputTokens;
  }

  const chunks = await client.chat.completions.create(params, {
    signal: options.signal ?? null,
  });

  const message: AssistantMessage = {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    modelId: model.id,
    usage: createEmptyUsage(),
    stopReason: "stop",
  };
  const toolCalls = new Map<
    number,
    { toolCall: ToolCallContent; contentIndex: number; json: string }
  >();

  const endLastBlock = () => {
    const contentIndex = message.content.length - 1;
    const block = message.content[contentIndex];
    if (block?.type === "text")
      events.push({ type: "text_end", contentIndex, text: block.text });
    if (block?.type === "thinking")
      events.push({
        type: "thinking_end",
        contentIndex,
        thinking: block.thinking,
      });
  };

  const appendText = (delta: string) => {
    let block = message.content.at(-1);
    if (block?.type !== "text") {
      endLastBlock();
      block = { type: "text", text: "" };
      message.content.push(block);
      events.push({
        type: "text_start",
        contentIndex: message.content.length - 1,
      });
    }
    block.text += delta;
    events.push({
      type: "text_delta",
      contentIndex: message.content.length - 1,
      delta,
    });
  };

  const appendThinking = (delta: string) => {
    let block = message.content.at(-1);
    if (block?.type !== "thinking") {
      endLastBlock();
      block = { type: "thinking", thinking: "" };
      message.content.push(block);
      events.push({
        type: "thinking_start",
        contentIndex: message.content.length - 1,
      });
    }
    block.thinking += delta;
    events.push({
      type: "thinking_delta",
      contentIndex: message.content.length - 1,
      delta,
    });
  };

  events.push({ type: "start" });

  for await (const chunk of chunks) {
    if (chunk.usage) {
      const cached = chunk.usage.prompt_tokens_details?.cached_tokens ?? 0;
      message.usage.inputTokens = chunk.usage.prompt_tokens - cached;
      message.usage.cacheReadTokens = cached;
      message.usage.outputTokens = chunk.usage.completion_tokens;
    }

    const choice = chunk.choices[0];
    if (!choice) continue;
    const delta = choice.delta as typeof choice.delta & {
      reasoning_content?: string;
      reasoning?: string;
    };

    const reasoning = delta.reasoning_content ?? delta.reasoning;
    if (reasoning) appendThinking(reasoning);
    if (delta.content) appendText(delta.content);

    for (const call of delta.tool_calls ?? []) {
      let pending = toolCalls.get(call.index);
      if (!pending) {
        endLastBlock();
        const toolCall: ToolCallContent = {
          type: "toolCall",
          toolCallId: call.id ?? `call_${call.index}`,
          toolName: call.function?.name ?? "",
          input: {},
        };
        pending = { toolCall, contentIndex: message.content.length, json: "" };
        toolCalls.set(call.index, pending);
        message.content.push(toolCall);
        events.push({
          type: "toolcall_start",
          contentIndex: pending.contentIndex,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
        });
      }
      const args = call.function?.arguments;
      if (args) {
        pending.json += args;
        events.push({
          type: "toolcall_delta",
          contentIndex: pending.contentIndex,
          delta: args,
        });
      }
    }

    if (choice.finish_reason)
      message.stopReason = stopReasons[choice.finish_reason] ?? "stop";
  }

  endLastBlock();

  for (const { toolCall, contentIndex, json } of toolCalls.values()) {
    try {
      toolCall.input = json ? JSON.parse(json) : {};
    } catch {
      throw new Error(
        `Tool call "${toolCall.toolName}" has invalid JSON input: ${json}`,
      );
    }
    events.push({ type: "toolcall_end", contentIndex, toolCall });
  }

  if (toolCalls.size > 0) message.stopReason = "toolUse";
  message.usage.costUsd = calculateCost(model, message.usage);
  events.push({ type: "done", message });
};

const joinText = (blocks: TextContent[]) =>
  blocks.map((block) => block.text).join("");

function toOpenAIMessages(context: Context): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: context.systemPrompt },
  ];

  for (const message of context.messages) {
    if (message.role === "user") {
      messages.push({
        role: "user",
        content:
          typeof message.content === "string"
            ? message.content
            : joinText(message.content),
      });
    } else if (message.role === "toolResult") {
      messages.push({
        role: "tool",
        tool_call_id: message.toolCallId,
        content: joinText(message.content),
      });
    } else {
      const text = joinText(
        message.content.filter((block) => block.type === "text"),
      );
      const toolCalls = message.content
        .filter((block) => block.type === "toolCall")
        .map((block) => ({
          id: block.toolCallId,
          type: "function" as const,
          function: {
            name: block.toolName,
            arguments: JSON.stringify(block.input),
          },
        }));
      messages.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    }
  }

  return messages;
}
