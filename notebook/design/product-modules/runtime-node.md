# runtime-node (`packages/runtime-node`)

Node adapters of the engine's `Runtime` ports, used by `apps/server`. Today all its files are placeholders.

## MVP design

- **SQLite Event store** (`sqlite-event-store.ts`): `node:sqlite`, one database file for the server. One `events` table keyed by `(session_id, seq)` with `id`, `run_id`, `caused_by_event_id`, `type`, `ts`, `payload` (JSON). `read(afterSeq)` returns a Session's Events in `seq` order and validates each with `parseEvent`. A `sessions` list query feeds the web sidebar.
- **HTTP sandbox client** (`http-sandbox-client.ts`): `callTool(toolCall, signal, onOutput?)` posts to `sandboxd`, reads the chunked response, passes output chunks to `onOutput`, and returns the final `ToolResult`. The abort signal cancels the request, and `sandboxd` kills the command.
- **Blob store** (`fs-blob-store.ts`): not needed for the MVP; output is trimmed instead. Stays a placeholder.

## Rules

- Deleting a Session deletes all its rows, which is how user data is erased.
- Events are append-only: no updates.

## Later

Postgres mirror, blob store for full outputs, replaced in production by Durable Object SQLite and R2 adapters.
