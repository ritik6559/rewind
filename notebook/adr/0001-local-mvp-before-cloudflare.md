# The MVP runs locally on Node and Docker, not on Cloudflare

The target design in `.temp/architecture.html` runs each Session in a Durable Object and each user's Computer in a Cloudflare Container. For the first evaluation (November 2026) the MVP instead runs as a local Hono server on Node, with a WebSocket to a Vite/React page, Events in `node:sqlite`, and tools served by `sandboxd` inside one local Docker container with the repo mounted at `/workspace`. We chose this because the project is built by one person with a deadline of days, and the Cloudflare pieces it would need (container scheduling and snapshots) are in beta and still need spikes. The engine only talks to the `Runtime` ports (`EventStore`, `SandboxClient`, model stream), so the move to Cloudflare later replaces the adapters, not the loop.

## Consequences

- The WebSocket message shapes follow the doc (`{t:"event"}`, `{t:"delta"}`, `subscribe(afterSeq)`), so moving to a Durable Object later changes the server, not the web app.
- The MVP uses a plain loop in `run/run-loop.ts`. The graph engine placeholder files stay, to be built when the first sub-agent needs them.
- One repo per server start, no GitHub, no auth, no Postgres, no multi-user isolation. These are not missing by accident: they wait for the Cloudflare phase.
- If Docker fails, `sandboxd` runs as a plain process on the host using Git Bash. The `SandboxClient` contract is the same, but there is no isolation from the host.
