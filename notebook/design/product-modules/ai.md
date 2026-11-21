# ai (`packages/ai`, `@rewind/ai`)

The model layer. One message format and one stream protocol for every provider, so the engine never knows which provider it talks to. It never imports ArkType or tool code.

## Exists

- `stream(model, context, options)` returns an `AssistantMessageEventStream`: `start`, `text_*`, `thinking_*`, `toolcall_*`, then exactly one final `done` or `error`. `complete()` awaits the final message.
- Adapter errors and thrown exceptions become a final `error` event with an `AssistantMessage` (`stopReason: "error" | "aborted"`), so callers never see a thrown error.
- Adapters: `openai-completions` and `faux` (scripted replies for tests).
- Model registry generated from models.dev (`models/generated.ts`, `getModel`, `getModels`), prices per million tokens, and `calculateCost`.
- API keys from env (`keys.ts`).

## MVP use

- One model: `gpt-5.4-mini` through `openai-completions`, picked in server config.
- The engine turns `text_delta` into `{t:"delta", kind:"model.text"}` for the web app and stores only the final message in `model.response_received`.
- Aborting the Run's signal cancels the in-flight request (Stop button).

## MVP changes

None planned. If the OpenAI call fails, the Run fails; there is no retry in the MVP.

## Later

`anthropic-messages`, `google-generative-ai` and `openai-responses` adapters; OpenAI-compatible providers through the existing adapter; `transform.ts` for switching providers mid-Session; compat flags; prompt caching; AI Gateway base URLs.
