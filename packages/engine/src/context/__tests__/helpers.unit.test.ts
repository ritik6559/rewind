import { describe, expect, it } from "vitest";
import { exceededLimit } from "../../run/budgets.ts";
import { redactSecrets } from "../redact.ts";
import { truncateOutput } from "../truncate.ts";

describe("truncateOutput", () => {
  it("keeps short output as it is", () => {
    expect(truncateOutput("hello", 10)).toBe("hello");
  });

  it("keeps the start and end of long output and says how much was left out", () => {
    const text = `${"a".repeat(50)}${"b".repeat(50)}`;

    expect(truncateOutput(text, 20)).toBe(
      `${"a".repeat(10)}\n[... 80 characters omitted ...]\n${"b".repeat(10)}`,
    );
  });
});

describe("redactSecrets", () => {
  it("replaces keys and tokens anywhere in a value", () => {
    const value = {
      output: "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz0123",
      nested: ["token ghp_abcdefghijklmnopqrstuvwxyz0123456789"],
    };

    expect(redactSecrets(value)).toEqual({
      output: "OPENAI_API_KEY=[redacted]",
      nested: ["token [redacted]"],
    });
  });

  it("leaves text without secrets alone", () => {
    expect(redactSecrets({ text: "npm test passed" })).toEqual({
      text: "npm test passed",
    });
  });
});

describe("exceededLimit", () => {
  const limits = { maxSteps: 3, maxCostUsd: 1 };

  it("allows a run under both limits", () => {
    expect(exceededLimit({ stepCount: 2, costUsd: 0.5 }, limits)).toBeNull();
  });

  it("stops a run at the step limit", () => {
    expect(exceededLimit({ stepCount: 3, costUsd: 0 }, limits)).toBe(
      "Run stopped after 3 steps.",
    );
  });

  it("stops a run at the cost limit", () => {
    expect(exceededLimit({ stepCount: 1, costUsd: 1 }, limits)).toBe(
      "Run stopped at $1.00 of spend.",
    );
  });
});
