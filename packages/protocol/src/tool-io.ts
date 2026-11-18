import { type } from "arktype";

export const ToolCall = type({
  toolCallId: "string",
  toolName: "string",
  input: "Record<string, unknown>", 
});
export type ToolCall = typeof ToolCall.infer;

export const ToolResult = type({
  toolCallId: "string",
  succeeded: "boolean",
  output: "string", 
  "fullOutputKey?": "string", 
  "exitCode?": "number.integer",
  durationMs: "number.integer >= 0",
});
export type ToolResult = typeof ToolResult.infer;
