import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SandboxMessage } from "@rewind/protocol";
import { describe, expect, it } from "vitest";
import { createApp } from "../server.ts";

const app = createApp(mkdtempSync(join(tmpdir(), "sandboxd-")));

const post = (body: unknown) =>
  app.request("/v1/tool-calls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("sandboxd server", () => {
  it("answers the health check", async () => {
    const response = await app.request("/health");

    expect(await response.text()).toBe("ok");
  });

  it("streams output lines and ends with the result", async () => {
    const response = await post({
      toolCallId: "call_1",
      toolName: "shell_exec",
      input: { command: "echo hi" },
    });

    const messages = (await response.text())
      .trim()
      .split("\n")
      .map((line) => SandboxMessage.assert(JSON.parse(line)));

    expect(messages.at(0)).toEqual({ type: "output", chunk: "hi\n" });
    expect(messages.at(-1)).toMatchObject({
      type: "result",
      result: { toolCallId: "call_1", toolName: "shell_exec", output: "hi\n" },
    });
  });

  it("rejects a body that is not a tool call", async () => {
    const response = await post({ toolName: "shell_exec" });

    expect(response.status).toBe(400);
  });
});
