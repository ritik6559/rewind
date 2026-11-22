import { createFauxModel, type FauxReply } from "@rewind/ai";
import { Agent, type RunLimits } from "@rewind/engine";
import { newQuestionId } from "@rewind/protocol";
import { coreTools } from "@rewind/tools";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRuntime, type FakeTool } from "../index.ts";

function startSession(
  replies: FauxReply[],
  toolsByName: Record<string, FakeTool> = {},
  limits?: RunLimits,
) {
  const runtime = createMemoryRuntime(toolsByName);
  const session = new Agent(runtime, {
    model: createFauxModel(replies),
    tools: coreTools,
    ...(limits && { limits }),
  });
  const eventTypes = () => runtime.events.read().map((event) => event.type);
  return { runtime, session, eventTypes };
}

const shellCall = (command: string) => ({
  toolName: "shell_exec",
  input: { command },
});

function aGate() {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

describe("run loop", () => {
  it("completes a run when the model answers without tools", async () => {
    const { session, eventTypes } = startSession([{ text: "Nothing to do." }]);

    await session.sendMessage("Hello");

    expect(eventTypes()).toEqual([
      "run.started",
      "session.status_changed",
      "user.message_sent",
      "model.request_sent",
      "model.response_received",
      "agent.message_sent",
      "run.completed",
      "session.status_changed",
    ]);
    expect(session.getState()).toMatchObject({
      status: "idle",
      activeRunId: null,
    });
  });

  it("runs a tool, gives the model its result, then completes", async () => {
    const { runtime, session } = startSession(
      [{ toolCalls: [shellCall("npm test")] }, { text: "Tests pass." }],
      { shell_exec: () => ({ output: "1 failed" }) },
    );

    await session.sendMessage("Fix the test");

    const events = runtime.events.read();
    const finished = events.find(
      (event) => event.type === "tool.call_finished",
    );
    expect(finished?.payload).toMatchObject({
      toolName: "shell_exec",
      output: "1 failed",
    });
    expect(events.at(-2)?.type).toBe("run.completed");
    expect(runtime.sandbox.calls).toHaveLength(1);
  });

  it("sends invalid tool input back to the model without running the tool", async () => {
    const { runtime, session, eventTypes } = startSession([
      { toolCalls: [shellCall("")] },
      { toolCalls: [{ toolName: "nope", input: {} }] },
      { text: "Giving up." },
    ]);

    await session.sendMessage("Do it");

    expect(
      eventTypes().filter((type) => type === "tool.input_rejected"),
    ).toHaveLength(2);
    expect(runtime.sandbox.calls).toHaveLength(0);
    expect(session.getState().status).toBe("idle");
  });

  it("ends the run with the summary when the model calls finish", async () => {
    const { runtime, session } = startSession([
      { toolCalls: [{ toolName: "finish", input: { summary: "Fixed it." } }] },
    ]);

    await session.sendMessage("Fix it");

    const completed = runtime.events
      .read()
      .find((event) => event.type === "run.completed");
    expect(completed?.payload).toEqual({ summary: "Fixed it.", stepCount: 1 });
  });

  it("waits for the user after ask_user and carries on with the answer", async () => {
    const { runtime, session, eventTypes } = startSession([
      {
        toolCalls: [
          { toolName: "ask_user", input: { question: "Which file?" } },
        ],
      },
      { text: "Using a.ts." },
    ]);

    await session.sendMessage("Fix it");

    const waiting = session.getState();
    expect(waiting.status).toBe("waiting_for_user");
    if (!waiting.waitingFor)
      throw new Error("The run is not waiting for a question");

    await session.answerQuestion(waiting.waitingFor.questionId, "a.ts");

    expect(eventTypes()).toContain("user.question_answered");
    expect(runtime.events.read().at(-2)?.type).toBe("run.completed");
    expect(session.getState().status).toBe("idle");
  });

  it("refuses an answer to a question that is not open", async () => {
    const { session } = startSession([{ text: "Hi" }]);
    await session.sendMessage("Hello");

    await expect(
      session.answerQuestion(newQuestionId(), "x"),
    ).rejects.toMatchObject({
      code: "NotWaitingForAnswer",
    });
  });

  it("stops a run that goes past the step limit", async () => {
    const { runtime, session } = startSession(
      Array.from({ length: 5 }, () => ({ toolCalls: [shellCall("ls")] })),
      { shell_exec: () => ({ output: "" }) },
      { maxSteps: 3, maxCostUsd: 1 },
    );

    await session.sendMessage("Loop forever");

    expect(runtime.sandbox.calls).toHaveLength(3);
    const failed = runtime.events
      .read()
      .find((event) => event.type === "run.failed");
    expect(failed?.payload).toEqual({
      errorMessage: "Run stopped after 3 steps.",
    });
    expect(session.getState().status).toBe("error");
  });

  it("fails the run with the model's error message", async () => {
    const { runtime, session } = startSession([{ error: "Rate limited" }]);

    await session.sendMessage("Hello");

    const failed = runtime.events
      .read()
      .find((event) => event.type === "run.failed");
    expect(failed?.payload).toEqual({ errorMessage: "Rate limited" });
    expect(session.getState().status).toBe("error");
  });

  it("cancels a running run on stop and still answers the open tool call", async () => {
    const gate = aGate();
    const { runtime, session, eventTypes } = startSession(
      [{ toolCalls: [shellCall("sleep 60")] }],
      { shell_exec: () => gate.opened.then(() => ({ output: "killed" })) },
    );

    const run = session.sendMessage("Wait");
    await vi.waitFor(() => expect(runtime.sandbox.calls).toHaveLength(1));
    session.stopRun();
    gate.open();
    await run;

    expect(eventTypes()).toContain("tool.call_finished");
    expect(runtime.events.read().at(-2)?.type).toBe("run.cancelled");
    expect(session.getState().status).toBe("idle");
  });

  it("adds a message sent during a run before the next model call", async () => {
    const gate = aGate();
    const { runtime, session, eventTypes } = startSession(
      [{ toolCalls: [shellCall("ls")] }, { text: "Done." }],
      { shell_exec: () => gate.opened.then(() => ({ output: "a.ts" })) },
    );

    const run = session.sendMessage("List files");
    await vi.waitFor(() => expect(runtime.sandbox.calls).toHaveLength(1));
    await session.sendMessage("Also check b.ts");
    expect(
      eventTypes().filter((type) => type === "user.message_sent"),
    ).toHaveLength(1);
    gate.open();
    await run;

    const types = eventTypes();
    const finishedAt = types.indexOf("tool.call_finished");
    expect(types[finishedAt + 1]).toBe("user.message_sent");
    expect(types[finishedAt + 2]).toBe("model.request_sent");
  });

  it("refuses to start a second run while one waits for the user", async () => {
    const { session } = startSession([
      { toolCalls: [{ toolName: "ask_user", input: { question: "Which?" } }] },
    ]);
    await session.sendMessage("Fix it");

    await expect(session.sendMessage("Again")).rejects.toMatchObject({
      code: "RunAlreadyActive",
    });
  });

  it("stores no secret that a tool prints", async () => {
    const { runtime, session } = startSession(
      [{ toolCalls: [shellCall("cat .env")] }, { text: "Done." }],
      {
        shell_exec: () => ({ output: "KEY=sk-abcdefghijklmnopqrstuvwxyz1234" }),
      },
    );

    await session.sendMessage("Look");

    expect(JSON.stringify(runtime.events.read())).not.toContain("sk-abcdef");
  });
});
