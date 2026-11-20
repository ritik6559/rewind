import { describe, expect, it } from "vitest";
import { aToolCall } from "./memory-runtime.fixture.ts";
import { MemoryRuntimeScenario } from "./memory-runtime.scenario.ts";

describe("fake sandbox", () => {
  it("returns the result of the function for that tool name", async () => {
    const scenario = MemoryRuntimeScenario.start({
      open_file: () => ({ output: "# Rewind" }),
    });

    const result = await scenario.callTool(
      aToolCall({ toolCallId: "call_7", toolName: "open_file" }),
    );

    expect(result).toEqual({
      toolCallId: "call_7",
      toolName: "open_file",
      isError: false,
      output: "# Rewind",
      durationMs: 0,
    });
  });

  it("gives the tool input to the tool function", async () => {
    const scenario = MemoryRuntimeScenario.start({
      open_file: (input) => ({ output: `opened ${String(input.path)}` }),
    });

    const result = await scenario.callTool(
      aToolCall({ input: { path: "src/index.ts" } }),
    );

    expect(result.output).toBe("opened src/index.ts");
  });

  it("keeps the error flag and exit code that the tool function returns", async () => {
    const scenario = MemoryRuntimeScenario.start({
      run_shell: () => ({
        output: "1 test failed",
        isError: true,
        exitCode: 1,
      }),
    });

    const result = await scenario.callTool(
      aToolCall({ toolName: "run_shell" }),
    );

    expect(result).toMatchObject({ isError: true, exitCode: 1 });
  });

  it("records each call in the order it was made", async () => {
    const scenario = MemoryRuntimeScenario.start({
      open_file: () => ({ output: "" }),
    });
    const firstCall = aToolCall({ toolCallId: "call_1" });
    const secondCall = aToolCall({ toolCallId: "call_2" });

    await scenario.callTool(firstCall);
    await scenario.callTool(secondCall);

    expect(scenario.observers.toolCallsReceived()).toEqual([
      firstCall,
      secondCall,
    ]);
  });

  it("returns an error result for a tool that has no function", async () => {
    const scenario = MemoryRuntimeScenario.start();

    const result = await scenario.callTool(aToolCall({ toolName: "git_push" }));

    expect(result.isError).toBe(true);
    expect(result.output).toContain('"git_push"');
  });

  it("does not treat built-in object names as tools", async () => {
    const scenario = MemoryRuntimeScenario.start();

    const result = await scenario.callTool(aToolCall({ toolName: "toString" }));

    expect(result.isError).toBe(true);
  });

  it("throws and records nothing when the signal is already aborted", async () => {
    const scenario = MemoryRuntimeScenario.start({
      open_file: () => ({ output: "" }),
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      scenario.callTool(aToolCall(), controller.signal),
    ).rejects.toThrow();
    expect(scenario.observers.toolCallsReceived()).toEqual([]);
  });
});
