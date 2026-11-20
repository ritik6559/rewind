import type { SandboxClient } from "@rewind/engine";
import type { ToolCall, ToolResult } from "@rewind/protocol";

export type FakeToolResult = Omit<
  ToolResult,
  "toolCallId" | "toolName" | "isError" | "durationMs"
> & { isError?: boolean };

export type FakeTool = (
  input: Record<string, unknown>,
) => FakeToolResult | Promise<FakeToolResult>;

export type FakeSandbox = SandboxClient & {
  readonly calls: readonly ToolCall[];
};

export function createFakeSandbox(
  toolsByName: Record<string, FakeTool>,
): FakeSandbox {
  const calls: ToolCall[] = [];
  return {
    calls,
    async callTool(toolCall, signal) {
      signal.throwIfAborted();
      calls.push(toolCall);
      const tool = Object.hasOwn(toolsByName, toolCall.toolName)
        ? toolsByName[toolCall.toolName]
        : undefined;
      const result = tool
        ? await tool(toolCall.input)
        : {
            output: `No fake tool named "${toolCall.toolName}". Add it to createMemoryRuntime.`,
            isError: true,
          };
      return {
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        isError: false,
        durationMs: 0,
        ...result,
      };
    },
  };
}
