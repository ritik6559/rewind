import {
  type Api,
  type AssistantMessage,
  createEmptyUsage,
} from "@rewind/protocol";
import { AssistantMessageEventStream } from "./event-stream.ts";
import { getEnvApiKey } from "./keys.ts";
import { fauxAdapter } from "./providers/faux.ts";
import { openaiCompletionsAdapter } from "./providers/openai-completions.ts";
import type { Context, Model } from "./types.ts";

export type StreamOptions = {
  apiKey?: string;
  signal?: AbortSignal;
  maxOutputTokens?: number;
};

export type Adapter = (
  model: Model,
  context: Context,
  options: StreamOptions,
  events: AssistantMessageEventStream,
) => Promise<void>;

const adapters: Partial<Record<Api, Adapter>> = {
  faux: fauxAdapter,
  "openai-completions": openaiCompletionsAdapter,
};

export function stream(
  model: Model,
  context: Context,
  options: StreamOptions = {},
): AssistantMessageEventStream {
  const events = new AssistantMessageEventStream();
  const adapter = adapters[model.api];

  if (!adapter) {
    events.push(failure(model, `No adapter for api ${model.api}`, options));
    return events;
  }

  const apiKey = options.apiKey ?? getEnvApiKey(model.provider);

  Promise.resolve()
    .then(() =>
      adapter(
        model,
        context,
        apiKey ? { ...options, apiKey } : options,
        events,
      ),
    )
    .then(
      () =>
        events.push(
          failure(model, "Adapter ended without a final event", options),
        ),
      (error: unknown) =>
        events.push(
          failure(
            model,
            error instanceof Error ? error.message : String(error),
            options,
          ),
        ),
    );

  return events;
}

export function complete(
  model: Model,
  context: Context,
  options: StreamOptions = {},
): Promise<AssistantMessage> {
  return stream(model, context, options).result();
}

function failure(model: Model, errorMessage: string, options: StreamOptions) {
  const message: AssistantMessage = {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    modelId: model.id,
    usage: createEmptyUsage(),
    stopReason: options.signal?.aborted ? "aborted" : "error",
    errorMessage,
  };
  return { type: "error" as const, message };
}
