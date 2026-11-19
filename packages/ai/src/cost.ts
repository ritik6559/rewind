import type { Usage } from "@rewind/protocol";
import type { Model } from "./types.ts";

export function calculateCost(model: Model, usage: Usage): number {
  const price = model.pricePerMillionTokens;
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
}
