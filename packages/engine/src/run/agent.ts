import type { Model } from "@rewind/ai";
import {
  addUsage,
  createInitialSessionState,
  type Delta,
  type EventId,
  type EventPayload,
  type EventType,
  type NewEvent,
  type QuestionId,
  type RunId,
  type SessionState,
  type SessionStatus,
  type ToolCallContent,
  type ToolResult,
  type ToolSpec,
} from "@rewind/protocol";
import type { ToolDefinition } from "@rewind/tools";
import { type } from "arktype";
import { buildMessages } from "../context/builder.ts";
import { redactSecrets } from "../context/redact.ts";
import { truncateOutput } from "../context/truncate.ts";
import { EngineError } from "../errors.ts";
import { systemPrompt } from "../prompts/system.ts";
import type { Runtime } from "../runtime/types.ts";
import {
  DEFAULT_RUN_LIMITS,
  exceededLimit,
  type RunLimits,
} from "./budgets.ts";

export type AgentConfig = {
  model: Model;
  tools: ToolDefinition[];
  limits?: RunLimits;
  onDelta?: (delta: Delta) => void;
};

type ActiveRun = { runId: RunId; stepCount: number; costUsd: number };
type StepOutcome = "continue" | "ended" | "suspended";
type CallOutcome = "done" | "suspended" | { summary: string };

export class Agent {
  private readonly runtime: Runtime;
  private readonly model: Model;
  private readonly limits: RunLimits;
  private readonly onDelta: ((delta: Delta) => void) | undefined;
  private readonly toolsByName: Map<string, ToolDefinition>;
  private readonly toolSpecs: ToolSpec[];

  private readonly state: SessionState = createInitialSessionState();
  private activeRun: ActiveRun | null = null;
  private controller: AbortController | null = null;
  private heldMessages: string[] = [];

  constructor(runtime: Runtime, config: AgentConfig) {
    this.runtime = runtime;
    this.model = config.model;
    this.limits = config.limits ?? DEFAULT_RUN_LIMITS;
    this.onDelta = config.onDelta;
    this.toolsByName = new Map(config.tools.map((tool) => [tool.name, tool]));
    this.toolSpecs = config.tools.map(
      ({ name, description, inputJsonSchema }) => ({
        name,
        description,
        inputJsonSchema,
      }),
    );
  }

  getState(): SessionState {
    return { ...this.state, activeRunId: this.activeRun?.runId ?? null };
  }

  async sendMessage(text: string): Promise<void> {
    if (this.activeRun && this.state.status === "running") {
      this.heldMessages.push(text);
      return;
    }
    if (this.activeRun) {
      throw new EngineError("RunAlreadyActive", {
        activeRunId: this.activeRun.runId,
      });
    }

    const run: ActiveRun = {
      runId: this.runtime.ids.newRunId(),
      stepCount: 0,
      costUsd: 0,
    };
    this.activeRun = run;
    this.recordEvent("run.started", { trigger: "user_message" });
    this.setStatus("running");
    this.recordEvent("user.message_sent", { text });
    await this.runUntilEndedOrWaiting(run);
  }

  async answerQuestion(questionId: QuestionId, text: string): Promise<void> {
    const run = this.activeRun;
    const openQuestionId = this.state.waitingFor?.questionId ?? null;

    if (!run || openQuestionId !== questionId) {
      throw new EngineError("NotWaitingForAnswer", {
        answeredQuestionId: questionId,
        openQuestionId,
      });
    }

    this.recordEvent("user.question_answered", { questionId, answer: text });
    this.state.waitingFor = null;
    this.setStatus("running");
    await this.runUntilEndedOrWaiting(run);
  }

  stopRun(): void {
    if (!this.activeRun) {
      throw new EngineError("NotRunning", { status: this.state.status });
    }
    if (this.controller) {
      this.controller.abort();
    } else {
      this.endRun("run.cancelled", { cancelledBy: "user" });
    }
  }

  private async runUntilEndedOrWaiting(run: ActiveRun): Promise<void> {
    const controller = new AbortController();
    this.controller = controller;

    try {
      while (true) {
        for (const text of this.heldMessages) {
          this.recordEvent("user.message_sent", { text });
        }

        this.heldMessages = [];
        const limit = exceededLimit(run, this.limits);

        if (limit) {
          return this.endRun("run.failed", { errorMessage: limit });
        }

        const outcome = await this.runOneStep(run, controller.signal);

        if (outcome === "ended") {
          return;
        }
        if (controller.signal.aborted) {
          return this.endRun("run.cancelled", { cancelledBy: "user" });
        }
        if (outcome === "suspended") {
          return;
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        this.endRun("run.cancelled", { cancelledBy: "user" });
      } else {
        this.endRun("run.failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      this.controller = null;
    }
  }

  private async runOneStep(
    run: ActiveRun,
    signal: AbortSignal,
  ): Promise<StepOutcome> {
    const message = await this.callModel(run, signal);
    const text = message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("");

    if (text) {
      this.recordEvent("agent.message_sent", { text });
    }

    const calls = message.content.filter(
      (part): part is ToolCallContent => part.type === "toolCall",
    );

    if (calls.length === 0) {
      if (this.heldMessages.length > 0) {
        return "continue";
      }

      this.endRun("run.completed", { summary: text, stepCount: run.stepCount });
      return "ended";
    }

    const outcome = await this.runToolCalls(run, calls, signal);

    if (outcome === "suspended") {
      return "suspended";
    }
    if (outcome === "done") {
      return "continue";
    }
    this.endRun("run.completed", {
      summary: outcome.summary,
      stepCount: run.stepCount,
    });

    return "ended";
  }

  private async callModel(run: ActiveRun, signal: AbortSignal) {
    const requested = this.recordEvent("model.request_sent", {
      provider: this.model.provider,
      modelId: this.model.id,
      stepNumber: run.stepCount + 1,
    });
    const startedAt = this.runtime.clock.now();
    const modelStream = this.runtime.streamModel(
      this.model,
      {
        systemPrompt,
        messages: buildMessages(this.runtime.events.read()),
        tools: this.toolSpecs,
      },
      { signal },
    );

    for await (const event of modelStream) {
      if (event.type === "text_delta") {
        this.onDelta?.({
          runId: run.runId,
          kind: "model.text",
          chunk: event.delta,
        });
      }
    }

    const message = await modelStream.result();

    if (message.stopReason === "error" || message.stopReason === "aborted") {
      throw new Error(message.errorMessage ?? "The model call was aborted.");
    }

    run.stepCount += 1;
    run.costUsd += message.usage.costUsd;
    this.state.totalUsage = addUsage(this.state.totalUsage, message.usage);
    this.recordEvent(
      "model.response_received",
      {
        assistantMessage: message,
        durationMs: this.runtime.clock.now() - startedAt,
      },
      requested.id,
    );

    return message;
  }

  private async runToolCalls(
    run: ActiveRun,
    calls: ToolCallContent[],
    signal: AbortSignal,
  ): Promise<CallOutcome> {
    const runsInEngine = (call: ToolCallContent) =>
      this.toolsByName.get(call.toolName)?.runsIn === "engine";
    const ordered = calls.toSorted(
      (a, b) => Number(runsInEngine(a)) - Number(runsInEngine(b)),
    );

    let outcome: CallOutcome = "done";

    for (const call of ordered) {
      if (outcome === "done") {
        outcome = await this.runOneToolCall(run, call, signal);
      } else {
        this.recordToolResult(
          call,
          "Not run: the run is already ending or waiting.",
          true,
          null,
        );
      }
    }
    return outcome;
  }

  private async runOneToolCall(
    run: ActiveRun,
    call: ToolCallContent,
    signal: AbortSignal,
  ): Promise<CallOutcome> {
    const { toolCallId, toolName } = call;
    const reject = (validationError: string): CallOutcome => {
      this.recordEvent("tool.input_rejected", {
        toolCallId,
        toolName,
        validationError,
      });
      return "done";
    };

    const tool = this.toolsByName.get(toolName);
    if (!tool) {
      return reject(
        `Unknown tool "${toolName}". Available tools: ${[...this.toolsByName.keys()].join(", ")}.`,
      );
    }

    const input = tool.input(call.input);
    if (input instanceof type.errors) return reject(input.summary);

    const started = this.recordEvent("tool.call_started", {
      toolCallId,
      toolName,
      input,
    });

    if (tool.runsIn === "sandbox") {
      await this.runToolInSandbox(run, call, input, signal, started.id);
      return "done";
    }
    if (toolName === "ask_user") {
      this.pauseForUserAnswer(input);
      return "suspended";
    }
    if (toolName === "finish") {
      this.recordToolResult(call, "Run finished.", false, started.id);
      return { summary: String(input.summary) };
    }
    return reject(`Tool "${toolName}" has no handler.`);
  }

  private async runToolInSandbox(
    run: ActiveRun,
    call: ToolCallContent,
    input: Record<string, unknown>,
    signal: AbortSignal,
    startedEventId: EventId,
  ): Promise<void> {
    const { toolCallId, toolName } = call;
    const startedAt = this.runtime.clock.now();
    let result: ToolResult;
    try {
      result = await this.runtime.sandbox.callTool(
        { toolCallId, toolName, input },
        signal,
        (chunk) =>
          this.onDelta?.({
            runId: run.runId,
            toolCallId,
            kind: "tool.output",
            chunk,
          }),
      );
    } catch (error) {
      result = {
        toolCallId,
        toolName,
        isError: true,
        output: error instanceof Error ? error.message : String(error),
        durationMs: this.runtime.clock.now() - startedAt,
      };
    }
    this.recordEvent(
      "tool.call_finished",
      { ...result, output: truncateOutput(result.output) },
      startedEventId,
    );
  }

  private pauseForUserAnswer(input: Record<string, unknown>): void {
    const { question, suggestedAnswers } = input as {
      question: string;
      suggestedAnswers?: string[];
    };
    const questionId = this.runtime.ids.newQuestionId();
    this.recordEvent("agent.question_asked", {
      questionId,
      question,
      ...(suggestedAnswers && { suggestedAnswers }),
    });
    this.state.waitingFor = { kind: "question", questionId };
    this.setStatus("waiting_for_user");
  }

  private recordToolResult(
    call: ToolCallContent,
    output: string,
    isError: boolean,
    causedByEventId: EventId | null,
  ): void {
    this.recordEvent(
      "tool.call_finished",
      {
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        isError,
        output,
        durationMs: 0,
      },
      causedByEventId,
    );
  }

  private endRun<T extends "run.completed" | "run.failed" | "run.cancelled">(
    eventType: T,
    payload: EventPayload<T>,
  ): void {
    this.recordEvent(eventType, payload);
    this.heldMessages = [];
    this.state.waitingFor = null;
    this.setStatus(eventType === "run.failed" ? "error" : "idle");
    this.activeRun = null;
  }

  private setStatus(to: SessionStatus): void {
    if (this.state.status === to) return;
    this.recordEvent("session.status_changed", { from: this.state.status, to });
    this.state.status = to;
  }

  private recordEvent<T extends EventType>(
    eventType: T,
    payload: EventPayload<T>,
    causedByEventId: EventId | null = null,
  ) {
    const stored = this.runtime.events.append(
      redactSecrets({
        type: eventType,
        runId: this.activeRun?.runId ?? null,
        causedByEventId,
        payload,
      }) as NewEvent<T>,
    );

    this.state.lastSeq = stored.seq;
    return stored;
  }
}
