import type { ToolResult } from "@rewind/protocol";

export type ToolOutput = Omit<
  ToolResult,
  "toolCallId" | "toolName" | "isError" | "durationMs"
> & { isError?: boolean };

export type ToolContext = {
  root: string;
  signal: AbortSignal;
  onOutput: (chunk: string) => void;
};
