import type { ToolCall, ToolResult } from "@rewind/protocol";
import {
  createFileTool,
  listFilesTool,
  openFileTool,
  shellExecTool,
  strReplaceTool,
  type ToolDefinition,
} from "@rewind/tools";
import { type } from "arktype";
import { createFile, openFile, strReplace } from "./editor/files.ts";
import { listFiles } from "./editor/search.ts";
import { runShell } from "./shell/exec.ts";
import type { ToolContext, ToolOutput } from "./types.ts";

type Executor = (
  input: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolOutput>;

function executor<Input extends Record<string, unknown>>(
  tool: ToolDefinition<Input>,
  run: (input: Input, context: ToolContext) => Promise<ToolOutput>,
): [string, Executor] {
  return [
    tool.name,
    async (rawInput, context) => {
      const input = tool.input(rawInput);
      if (input instanceof type.errors) {
        return { output: input.summary, isError: true };
      }
      return run(input as Input, context);
    },
  ];
}

const executors = new Map<string, Executor>([
  executor(shellExecTool, runShell),
  executor(listFilesTool, listFiles),
  executor(openFileTool, openFile),
  executor(createFileTool, createFile),
  executor(strReplaceTool, strReplace),
]);

export async function runToolCall(
  call: ToolCall,
  context: ToolContext,
): Promise<ToolResult> {
  const startedAt = Date.now();
  let outcome: ToolOutput;
  try {
    const run = executors.get(call.toolName);
    outcome = run
      ? await run(call.input, context)
      : { output: `Unknown tool "${call.toolName}".`, isError: true };
  } catch (error) {
    outcome = {
      output: error instanceof Error ? error.message : String(error),
      isError: true,
    };
  }
  return {
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    isError: false,
    durationMs: Date.now() - startedAt,
    ...outcome,
  };
}
