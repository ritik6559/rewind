export const APIS = ["openai-completions", "faux"] as const;

export const STOP_REASONS = [
  "stop",
  "length",
  "toolUse",
  "error",
  "aborted",
] as const;
