import { type } from "arktype";
import { baseScope } from "../base.scope.ts";

export const ToolCall = type({
  toolCallId: "string",
  toolName: "string",
  input: "Record<string, unknown>",
});
export type ToolCall = typeof ToolCall.infer;

export const ToolSpec = type({
  name: "string",
  description: "string",
  inputJsonSchema: "Record<string, unknown>",
});
export type ToolSpec = typeof ToolSpec.infer;

export const ToolResult = baseScope.type({
  toolCallId: "string",
  toolName: "string",
  isError: "boolean",
  output: "string",
  "fullOutputKey?": type("string").configure({
    description:
      "the blob store key of the full output, set only when output was cut",
  }),
  "exitCode?": "number.integer",
  durationMs: "durationMs",
});
export type ToolResult = typeof ToolResult.infer;

export const SandboxMessage = type({ type: "'output'", chunk: "string" }).or({
  type: "'result'",
  result: ToolResult,
});
export type SandboxMessage = typeof SandboxMessage.infer;
