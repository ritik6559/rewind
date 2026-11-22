import type { SandboxClient } from "@rewind/engine";
import { SandboxMessage, type ToolResult } from "@rewind/protocol";

async function readResult(
  body: ReadableStream<Uint8Array>,
  onOutput: ((chunk: string) => void) | undefined,
): Promise<ToolResult> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const bytes of body) {
    buffer += decoder.decode(bytes, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      const message = SandboxMessage.assert(JSON.parse(line));
      if (message.type === "result") return message.result;
      onOutput?.(message.chunk);
    }
  }
  throw new Error("sandboxd closed the stream without a result.");
}

export function createHttpSandboxClient(baseUrl: string): SandboxClient {
  const url = new URL("/v1/tool-calls", baseUrl);
  return {
    async callTool(toolCall, signal, onOutput) {
      const startedAt = Date.now();
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toolCall),
          signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(
            `sandboxd answered ${response.status}: ${await response.text()}`,
          );
        }
        return await readResult(response.body, onOutput);
      } catch (error) {
        return {
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          isError: true,
          output: signal.aborted
            ? "The tool call was cancelled."
            : `The sandbox call failed: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: Date.now() - startedAt,
        };
      }
    },
  };
}
