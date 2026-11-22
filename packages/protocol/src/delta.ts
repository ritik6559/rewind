import type { RunId } from "./ids.ts";

export type Delta = {
  runId: RunId;
  toolCallId?: string;
  kind: "model.text" | "tool.output";
  chunk: string;
};
