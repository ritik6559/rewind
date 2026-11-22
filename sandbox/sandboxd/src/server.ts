import { arktypeValidator } from "@hono/arktype-validator";
import { type SandboxMessage, ToolCall } from "@rewind/protocol";
import { Hono } from "hono";
import { runToolCall } from "./run-tool.ts";

export function createApp(root: string) {
  const app = new Hono();

  app.get("/health", (context) => context.text("ok"));

  app.post("/v1/tool-calls", arktypeValidator("json", ToolCall), (context) => {
    const call = context.req.valid("json");
    const abort = new AbortController();
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (message: SandboxMessage) => {
          if (abort.signal.aborted) return;
          controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
        };
        const result = await runToolCall(call, {
          root,
          signal: abort.signal,
          onOutput: (chunk) => send({ type: "output", chunk }),
        });
        send({ type: "result", result });
        if (!abort.signal.aborted) controller.close();
      },
      cancel() {
        abort.abort();
      },
    });

    return new Response(body, {
      headers: { "content-type": "application/x-ndjson" },
    });
  });

  return app;
}
