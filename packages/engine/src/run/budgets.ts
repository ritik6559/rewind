export type RunLimits = { maxSteps: number; maxCostUsd: number };

export const DEFAULT_RUN_LIMITS: RunLimits = { maxSteps: 50, maxCostUsd: 1 };

export function exceededLimit(
  run: { stepCount: number; costUsd: number },
  limits: RunLimits,
): string | null {
  if (run.stepCount >= limits.maxSteps) {
    return `Run stopped after ${limits.maxSteps} steps.`;
  }
  if (run.costUsd >= limits.maxCostUsd) {
    return `Run stopped at $${limits.maxCostUsd.toFixed(2)} of spend.`;
  }
  return null;
}
