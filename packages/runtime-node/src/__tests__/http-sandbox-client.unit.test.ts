import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { ToolCall, ToolResult } from "@rewind/protocol";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpSandboxClient } from "../http-sandbox-client.ts";

const toolCall: ToolCall = {
  toolCallId: "call_1",
  toolName: "shell_exec",
  input: { command: "echo hi" },
};

const result: ToolResult = {
  toolCallId: "call_1",
  toolName: "shell_exec",
  isError: false,
  output: "hi\n",
  exitCode: 0,
  durationMs: 5,
};

let closeServer: () => void = () => {};

afterEach(() => closeServer());

async function startServer(handle: (response: ServerResponse) => void) {
  const server = createServer((request, response) => {
    request.resume();
    request.on("end", () => handle(response));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closeServer = () => server.close();
  const { port } = server.address() as AddressInfo;
  return {
    server,
    client: createHttpSandboxClient(`http://127.0.0.1:${port}`),
  };
}

const line = (message: unknown) => `${JSON.stringify(message)}\n`;

describe("createHttpSandboxClient", () => {
  it("passes output chunks on and returns the result", async () => {
    const { client } = await startServer((response) => {
      response.write(line({ type: "output", chunk: "h" }));
      response.write(line({ type: "output", chunk: "i\n" }).slice(0, 10));
      response.end(
        line({ type: "output", chunk: "i\n" }).slice(10) +
          line({ type: "result", result }),
      );
    });
    const chunks: string[] = [];

    const returned = await client.callTool(
      toolCall,
      new AbortController().signal,
      (chunk) => chunks.push(chunk),
    );

    expect(chunks).toEqual(["h", "i\n"]);
    expect(returned).toEqual(result);
  });

  it("returns an error result when sandboxd rejects the call", async () => {
    const { client } = await startServer((response) => {
      response.statusCode = 400;
      response.end("bad input");
    });

    const returned = await client.callTool(
      toolCall,
      new AbortController().signal,
    );

    expect(returned.isError).toBe(true);
    expect(returned.output).toContain("400: bad input");
  });

  it("returns an error result when the stream ends without a result", async () => {
    const { client } = await startServer((response) => {
      response.end(line({ type: "output", chunk: "partial" }));
    });

    const returned = await client.callTool(
      toolCall,
      new AbortController().signal,
    );

    expect(returned.isError).toBe(true);
    expect(returned.output).toContain("without a result");
  });

  it("returns an error result when sandboxd cannot be reached", async () => {
    const client = createHttpSandboxClient("http://127.0.0.1:1");

    const returned = await client.callTool(
      toolCall,
      new AbortController().signal,
    );

    expect(returned.isError).toBe(true);
    expect(returned.output).toContain("The sandbox call failed");
  });

  it("closes the request when the signal aborts", async () => {
    let serverSawClose: () => void = () => {};
    const closed = new Promise<void>((resolve) => {
      serverSawClose = resolve;
    });
    const { client } = await startServer((response) => {
      response.write(line({ type: "output", chunk: "working" }));
      response.on("close", serverSawClose);
    });
    const controller = new AbortController();

    const returned = await client.callTool(toolCall, controller.signal, () =>
      controller.abort(),
    );
    await closed;

    expect(returned.isError).toBe(true);
    expect(returned.output).toBe("The tool call was cancelled.");
  });
});
