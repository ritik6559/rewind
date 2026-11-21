# protocol (`packages/protocol`)

The shared language of every other module. It holds data shapes only: IDs, Events, messages, tool calls, Session state and usage. No ports, no classes, no I/O. Anything two packages both need lives here.

## Exists

- **IDs** (`ids.ts`): branded `SessionId`, `RunId`, `EventId`, `QuestionId`, made with UUIDv7.
- **Events** (`events/`): `NewEvent` and `StoredEvent` envelopes (`runId`, `causedByEventId`, then `id`, `sessionId`, `seq`, `ts`), an ArkType schema per Event type, and `parseEvent` which rejects unknown keys.
- **Event types:** `session.status_changed`, `run.started|completed|failed|cancelled`, `user.message_sent`, `agent.message_sent`, `model.request_sent`, `model.response_received`, `tool.call_started`, `tool.input_rejected`, `tool.call_finished`, `agent.question_asked`, `user.question_answered`.
- **Messages** (`messages/`): `UserMessage`, `AssistantMessage`, `ToolResultMessage`, the content blocks (text, thinking, toolCall), `Api`, `StopReason`.
- **Tools** (`tools/`): `ToolCall`, `ToolSpec` (name, description, JSON Schema), `ToolResult`.
- **Session** (`session/`): statuses `idle | running | waiting_for_user | error`, `SessionState`, `WaitingFor`.
- **Usage** (`usage/`): token and cost totals with `addUsage`.

## MVP changes

- **WebSocket messages.** The server and web app both need them, so they live here:
  - server → client: `{t:"event", e: StoredEvent}`, `{t:"delta", runId, toolCallId?, kind: "model.text" | "tool.output", chunk}`, `{t:"replay_done", lastSeq}`
  - client → server: `sendMessage(text)`, `answer(questionId, text)`, `stop()`, `subscribe(afterSeq)`
- **Limit reached.** `run.failed` keeps `errorMessage`; budget failures use a clear message ("Run stopped after 50 steps", "Run stopped at $1.00"). No new Event type is needed for the MVP.
- **Secret redaction** is not a protocol concern. The engine applies it before `append`.

## Rules

- Every Event carries a `sessionId`, so a Session can be deleted as a unit.
- Deltas are never Events and are never stored.
- No personal data in any ID.

## Later

`sandbox.*`, `file.changed`, `browser.*`, `approval.*`, `git.*`, `github.*`, `context.compacted`, `budget.warning`, `egress.blocked`, and the `actor` field from the architecture doc.
