# engine (`packages/engine`)

The brain. It runs a Session's Runs: builds the model context, calls the model, runs tools, enforces limits and records every Step as Events. It has no Cloudflare, Node or HTTP imports; it only talks to the `Runtime` ports.

## Exists

- **Runtime ports** (`runtime/types.ts`): `EventStore` (`append`, `read(afterSeq)`), `SandboxClient` (`callTool(toolCall, signal)`), `streamModel`, `Clock`, `IdGenerator`.
- **Errors** (`errors.ts`): `EngineError` with codes `RunAlreadyActive`, `NotRunning`, `NotWaitingForAnswer`, and `serializeErrorChain`.
- Placeholder files for the graph engine, nodes, registry, context, compaction, budgets, queues, recovery and state machine. These stay (see ADR 0001).

## MVP design

**Session API** (called by `apps/server`):
- `sendMessage(text)`: appends `user.message_sent`. Starts a Run if idle; if a Run is active, the loop picks the message up at the next Step.
- `answer(questionId, text)`: appends `user.question_answered` and continues the Run.
- `stop()`: aborts the Run's signal, appends `run.cancelled`, status goes to `idle`.
- An `onDelta(delta)` hook for live text and tool output, which the server forwards over the WebSocket.

**Loop** (`run/run-loop.ts`), a plain `while`:
1. Build the context from the Session's Events.
2. Append `model.request_sent`, stream the model, forward text deltas, append `model.response_received`.
3. No tool calls → append `agent.message_sent` and `run.completed`, status `idle`.
4. For each tool call: look it up, validate the input with its ArkType schema (`tool.input_rejected` on failure, the model sees the error), append `tool.call_started`, run it, append `tool.call_finished`.
5. `ask_user` → append `agent.question_asked`, status `waiting_for_user`, the loop returns. `finish` → complete the Run.
6. Check limits, then go to 1.

**Context builder** (`context/builder.ts`): a pure function from Events to `Context`. `user.message_sent` → user message, `model.response_received` → assistant message, `tool.call_finished` / `tool.input_rejected` → tool result message, `user.question_answered` → tool result for the `ask_user` call. Nothing is kept only in memory.

**Limits** (`run/budgets.ts`): per Run, at most 50 Steps and $1, checked after every Step from the usage in `model.response_received`. Hitting one appends `run.failed` with a clear message.

**Output trimming** (`context/truncate.ts`): tool output over about 8 KB keeps its start and end with "N lines omitted" in between.

**Redaction:** tool input and output pass through a redactor before `append` (keys that look like `sk-…`, `ghp_…`, values from `.env`).

**Status changes:** every change appends `session.status_changed`.

## Later

Graph engine and sub-agents, approvals, crash recovery and `--resume` (reconciling tool calls with no result), compaction, time limits, model retries, message queues.
