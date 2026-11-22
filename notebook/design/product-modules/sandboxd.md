# sandboxd (`sandbox/`)

The hands. A small Node HTTP server that runs inside the Computer and carries out sandbox tools on the Workspace. It holds no secrets and never calls the model.

## MVP design

- **Image** (`sandbox/Dockerfile`): Node 24, bash, git, ripgrep, and `sandboxd`. Build from the repo root: `docker build -f sandbox/Dockerfile -t rewind-sandbox .`.
- **Run:** `docker run -d -p 127.0.0.1:8080:8080 -v <repo>:/workspace rewind-sandbox`. Env: `WORKSPACE_ROOT` (default `/workspace`), `PORT` (default 8080). There is no auth, so the port is published to localhost only.
- **API:** `POST /v1/tool-calls` with a `ToolCall` as JSON. The response is NDJSON, one `SandboxMessage` per line (defined in `protocol`): `{type:"output", chunk}` while the tool runs, then one `{type:"result", result}` holding the `ToolResult`. Closing the request cancels the tool.
- **Path guard** (`paths.ts`): every path resolves inside `/workspace` or the call fails.
- **Shell** (`shell/`): `shell_exec` spawns `bash -lc <command>` in `/workspace`, streams stdout and stderr, kills the process group on timeout or when the request is cancelled.
- **Editor** (`editor/files.ts`): `list_files`, `open_file`, `create_file`, `str_replace` as in the tools design.
- **Health:** `GET /health` so the server can wait for the container before the first Run.

## Fallback

If Docker doesn't work, run the same `sandboxd` as a host process with Git Bash and the demo repo path as the root. Same HTTP contract, but no isolation from the host. See ADR 0001.

## Later

tmux persistent shells and background processes, edit history and `undo_edit`, `find_and_edit`, Chromium + Playwright + VNC, per-Session directories and port blocks, the egress gateway, Cloudflare Containers and snapshots.
