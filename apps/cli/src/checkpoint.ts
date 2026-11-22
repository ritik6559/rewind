import { getModel } from "@rewind/ai";
import { Agent, type Runtime } from "@rewind/engine";
import { createMemoryRuntime } from "@rewind/runtime-memory";
import { createHttpSandboxClient } from "@rewind/runtime-node";
import { coreTools } from "@rewind/tools";

const task =
  process.argv[2] ?? "The tests are failing. Find the bug and fix it.";
const sandboxUrl = process.env.SANDBOX_URL ?? "http://127.0.0.1:8080";
const model = getModel("openai", "gpt-5.4-mini");

if (!model) throw new Error("gpt-5.4-mini is not in the model registry.");
if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY in .env.");

const memory = createMemoryRuntime();
const sandbox = createHttpSandboxClient(sandboxUrl);
const runtime: Runtime = {
  ...memory,
  sandbox,
  clock: { now: Date.now },
  events: {
    read: memory.events.read,
    append(event) {
      const stored = memory.events.append(event);
      console.log(
        `\n[${stored.seq}] ${stored.type} ${JSON.stringify(stored.payload).slice(0, 300)}`,
      );
      return stored;
    },
  },
};

const agent = new Agent(runtime, {
  model,
  tools: coreTools,
  onDelta: (delta) => process.stdout.write(delta.chunk),
});

console.log(`Task: ${task}\nSandbox: ${sandboxUrl}\n`);
await agent.sendMessage(task);

const state = agent.getState();
const check = await sandbox.callTool(
  {
    toolCallId: "checkpoint",
    toolName: "shell_exec",
    input: { command: "npm test" },
  },
  new AbortController().signal,
);

console.log(`\nStatus: ${state.status}`);
console.log(`Cost: $${state.totalUsage.costUsd.toFixed(4)}`);
console.log(`Tests after the run: ${check.isError ? "FAILING" : "PASSING"}`);
process.exitCode = check.isError ? 1 : 0;
