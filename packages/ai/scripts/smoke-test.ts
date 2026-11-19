import assert from "node:assert/strict";
import { type Context, complete, getModel, stream } from "../src/index.ts";

const modelId = process.argv[2] ?? "gpt-4o-mini";
const model = getModel("openai", modelId);
if (!model) throw new Error(`Unknown model openai/${modelId}`);

const openFileTool = {
  name: "open_file",
  description: "Read a file from the workspace and return its contents.",
  inputJsonSchema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
};

async function check(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.log(
      `FAIL ${name}: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  }
}

console.log(`Model: openai/${modelId}\n`);

await check("text reply streams and reports usage", async () => {
  const reply = stream(model, {
    systemPrompt: "You are a test assistant.",
    messages: [{ role: "user", content: "Reply with exactly the word: pong" }],
    tools: [],
  });
  const eventTypes = new Set<string>();
  for await (const event of reply) eventTypes.add(event.type);
  const message = await reply.result();

  assert.equal(
    message.stopReason,
    "stop",
    message.errorMessage ?? "no error message",
  );
  assert.ok(eventTypes.has("text_delta"), "no text_delta events");
  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  assert.match(text.toLowerCase(), /pong/);
  assert.ok(message.usage.inputTokens > 0, "inputTokens is 0");
  assert.ok(message.usage.outputTokens > 0, "outputTokens is 0");
  assert.ok(message.usage.costUsd > 0, "costUsd is 0");
  console.log(
    `  text: ${JSON.stringify(text)}, usage: ${JSON.stringify(message.usage)}`,
  );
});

const toolContext: Context = {
  systemPrompt: "You are a coding agent. Use tools to read files.",
  messages: [
    {
      role: "user",
      content: "Read the file README.md using the open_file tool.",
    },
  ],
  tools: [openFileTool],
};

await check("tool call round trip", async () => {
  const first = await complete(model, toolContext);
  assert.equal(
    first.stopReason,
    "toolUse",
    first.errorMessage ?? "no error message",
  );
  const toolCall = first.content.find((block) => block.type === "toolCall");
  assert.ok(toolCall, "no tool call in reply");
  assert.equal(toolCall.toolName, "open_file");
  assert.equal(toolCall.input.path, "README.md");
  console.log(
    `  tool call: ${toolCall.toolName}(${JSON.stringify(toolCall.input)})`,
  );

  const second = await complete(model, {
    ...toolContext,
    messages: [
      ...toolContext.messages,
      first,
      {
        role: "toolResult",
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        content: [
          { type: "text", text: "# Rewind\nThe secret word is mango." },
        ],
        isError: false,
      },
      {
        role: "user",
        content: "What is the secret word in that file? Answer with one word.",
      },
    ],
  });
  assert.equal(
    second.stopReason,
    "stop",
    second.errorMessage ?? "no error message",
  );
  const answer = second.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  assert.match(answer.toLowerCase(), /mango/);
  console.log(`  answer after tool result: ${JSON.stringify(answer)}`);
});

await check("wrong API key ends with an error event", async () => {
  const message = await complete(model, toolContext, { apiKey: "sk-invalid" });
  assert.equal(message.stopReason, "error");
  assert.ok(message.errorMessage, "no errorMessage");
  console.log(`  error: ${message.errorMessage}`);
});

await check("abort ends with stopReason aborted", async () => {
  const controller = new AbortController();
  const reply = stream(model, toolContext, { signal: controller.signal });
  controller.abort();
  const message = await reply.result();
  assert.equal(message.stopReason, "aborted");
});
