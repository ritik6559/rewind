import { baseScope } from "../base.scope.ts";

export const Usage = baseScope.type({
  inputTokens: "count",
  outputTokens: "count",
  cacheReadTokens: "count",
  cacheWriteTokens: "count",
  costUsd: "number >= 0",
});
export type Usage = typeof Usage.infer;

export function createEmptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
  };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    costUsd: a.costUsd + b.costUsd,
  };
}
