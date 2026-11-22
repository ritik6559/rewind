# server (`apps/server`)

The local back end for the MVP. It wires the Node runtime, the model and the engine together and exposes Sessions to the web app. It replaces `apps/cli` as the entry point for now (the CLI stays a placeholder). In production its job moves to the Worker and the Session Durable Object.

## MVP design

- **Start:** `pnpm dev --repo ../demo-repo`. Checks `sandboxd` health, opens the SQLite database, serves the web app.
- **Config:** model `gpt-5.4-mini`, limits 50 Steps and $1 per Run, `sandboxd` URL, database path. `OPENAI_API_KEY` from `.env`, never sent to the browser or the sandbox.
- **REST** (Hono): `GET /api/sessions` (sidebar list), `POST /api/sessions` (new Session, returns its ID).
- **WebSocket** (`@hono/node-ws`) at `/api/sessions/:id/ws`:
  - on `subscribe(afterSeq)`: send stored Events after `afterSeq`, then `replay_done`, then live Events and deltas;
  - the `sendMessage`, `answer` and `stop` messages call the `Agent` methods `sendMessage`, `answerQuestion` and `stopRun`;
  - engine errors (`RunAlreadyActive`, `NotWaitingForAnswer` …) go back to that client as an error message.
- **One `Agent` per open Session**, kept in a map. Several browser tabs on one Session all get the same Events.

## Out of scope

Auth, multiple users, multiple repos, GitHub, deployment.

## Later

Becomes the Cloudflare Worker (Hono API) plus the Session Durable Object; the WebSocket message shapes stay the same.
