# MVP plan

Agreed on 2026-11-21. Deadline: finished by the night of 2026-11-22, evaluation on 2026-11-25. Terms are defined in [GLOSSARY.md](../../GLOSSARY.md); the main trade-off is in [ADR 0001](../adr/0001-local-mvp-before-cloudflare.md); each module's design is in [design/product-modules](../design/product-modules/).

## Goal

A user opens a web page, types a task, and watches the agent fix it in a fixed demo repo: live text, live tool output, questions they can answer, and a Stop button.

Done when the agent fixes the failing test in `demo-repo/` with no human help, started from the web page.

## In scope

| Area | Decision |
|---|---|
| Entry point | `apps/server` (Hono on Node) + `apps/web` (Vite + React). `apps/cli` stays a placeholder. |
| Live updates | WebSocket via `@hono/node-ws`. Server sends `{t:"event", e}` for stored Events and `{t:"delta", ...}` for streamed text and tool output. Client sends messages, answers and Stop; reconnect calls `subscribe(afterSeq)`. |
| Model | OpenAI only, `gpt-5.4-mini`, fixed in server config. |
| Loop | Plain `while` loop in `packages/engine/src/run/run-loop.ts`. Graph engine files stay as placeholders. |
| Context | Always rebuilt from the Session's Events. Nothing lives only in memory. |
| Events | `node:sqlite` store in `packages/runtime-node`. |
| Sandbox | `sandboxd` in one local Docker container, reached over HTTP, demo repo mounted at `/workspace`. Fallback after 2 hours of trouble: `sandboxd` as a host process using Git Bash. |
| Tools | `shell_exec`, `open_file`, `str_replace`, `create_file`, `finish`, `ask_user`. |
| `shell_exec` | One-shot `bash -lc`, repo root, 120 s timeout, output trimmed to about 8 KB head and tail. Streams stdout/stderr while running. |
| Streaming tools | `SandboxClient.callTool` gains an optional `onOutput(chunk)`; `sandboxd` sends a chunked HTTP response. Chunks are never stored; `tool.call_finished` holds the trimmed output. |
| Limits | Per Run: at most 50 Steps and $1. Hitting either fails the Run with a clear reason. |
| Repo | One fixed repo per server start (`--repo ../demo-repo`), shared by all Sessions. |
| UI | Chat timeline (messages, streamed agent text, collapsible tool cards, question reply box); header with status pill, Run cost and Stop; sidebar of past Sessions from SQLite. |

## Rules kept from day one

1. Every Event belongs to exactly one Session, so erasing a user means deleting their Sessions.
2. Secrets are redacted from tool input and output before an Event is stored.
3. No personal data in IDs, branch names or blob keys.

## Out of scope

Cloudflare, Durable Objects, Postgres, auth, GitHub and PRs, other model providers, browser tools, tmux and background shells, approvals, `--resume`, compaction, model retries, time limits, the diff ("Changes") card, tests beyond the checkpoint script.

## Schedule

| When | Work | Checkpoint |
|---|---|---|
| 2026-11-21 night | Loop, context builder, SQLite Event store, the six tools, `sandboxd` + Dockerfile, `demo-repo/` | A script makes the agent fix the failing test |
| 2026-11-22 morning | `apps/server`: Hono, WebSocket, limits | A WebSocket client can run a Session |
| 2026-11-22 afternoon | `apps/web`, styled | The demo works in the browser |
| 2026-11-22 evening | Rehearse, record a backup video, freeze features | — |

If time runs short, cut UI polish first. Never cut the checkpoint.

## Demo repo

A tiny TypeScript repo outside rewind with a few functions, one bug and one failing Vitest test. One easy task (about 5–10 Steps) and one stretch task. It must be small enough that `gpt-5.4-mini` succeeds reliably.
