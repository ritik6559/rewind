# Rewind

Rewind is a coding agent that works in its own sandbox. You give it a task on a repo. It reads files, edits code and runs commands in a Docker container, and every step is recorded as an Event that you can watch live.

The MVP runs locally on Node and Docker. The long-term target is Cloudflare (see [ADR 0001](notebook/adr/0001-local-mvp-before-cloudflare.md)).

## How it works

```
web UI  <-- WebSocket -->  server  -->  Agent (engine)  -->  OpenAI
                                          |
                                          +-- HTTP, NDJSON -->  sandboxd (Docker, repo at /workspace)
                                          |
                                          +-- Event store
```

The Agent runs a loop. It calls the model, runs the tool calls the model asks for, records each result as an Event, and repeats until the model finishes, asks the user a question, or hits a limit (50 Steps or $1 per Run). The model's context is always rebuilt from the stored Events.

## Packages

| Path                      | What it holds                                                 | State   |
| ------------------------- | ------------------------------------------------------------- | ------- |
| `packages/protocol`       | Shared data types: Events, messages, tools, Session state     | done    |
| `packages/ai`             | Model layer: OpenAI adapter, fake model, model registry, cost | done    |
| `packages/tools`          | `defineTool` and the seven core tools                         | done    |
| `packages/engine`         | The `Agent` run loop, context builder, redaction, limits      | done    |
| `packages/runtime-memory` | In-memory runtime used by the tests                           | done    |
| `packages/runtime-node`   | SQLite Event store and HTTP sandbox client                    | planned |
| `sandbox/sandboxd`        | Tool server that runs inside the sandbox container            | done    |
| `apps/server`, `apps/web` | Hono server and React UI                                      | planned |
| `apps/cli`, `evals`       | CLI and evaluations                                           | planned |

Some files are two-line placeholders for modules that come later (for example `engine/src/graph`). Their designs are in `notebook/design/product-modules/`.

## Run it

Needs Node 26, pnpm 12 and Docker.

```sh
pnpm install
pnpm test
pnpm check

docker build -f sandbox/Dockerfile -t rewind-sandbox .
docker run -d --name rewind-sandbox -p 127.0.0.1:8080:8080 -v <repo-path>:/workspace rewind-sandbox
```

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.

## Docs

- [GLOSSARY.md](GLOSSARY.md): the domain words (Session, Run, Step, Event, Workspace).
- [MVP plan](notebook/plans/mvp-plan.md): scope, what is cut, and the schedule.
- [Module designs](notebook/design/product-modules/): one doc per package.
- [ADRs](notebook/adr/): architecture decisions.
