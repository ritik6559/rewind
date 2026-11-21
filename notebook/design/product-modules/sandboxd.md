# sandboxd (`sandbox/`)

The hands. A small Node HTTP server that runs inside the Computer and carries out sandbox tools on the Workspace. It holds no secrets and never calls the model.

## MVP design

- **Image** (`sandbox/Dockerfile`): Node, bash, git, ripgrep, and `sandboxd`. Linux, amd64.
- **Run:** one local Docker container, the demo repo mounted at `/workspace`, port 8080 published to localhost only.
- **API:** `POST /v1/tools/:name` with the tool input as JSON. Response is chunked: output chunks while the tool runs, then one final line with the `ToolResult` fields (`isError`, `output`, `exitCode`, `durationMs`).
- **Path guard** (`paths.ts`): every path resolves inside `/workspace` or the call fails.
- **Shell** (`shell/`): `shell_exec` spawns `bash -lc <command>` in `/workspace`, streams stdout and stderr, kills the process group on timeout or when the request is cancelled.
- **Editor** (`editor/files.ts`): `open_file`, `create_file`, `str_replace` as in the tools design.
- **Health:** `GET /health` so the server can wait for the container before the first Run.

## Fallback

If Docker doesn't work, run the same `sandboxd` as a host process with Git Bash and the demo repo path as the root. Same HTTP contract, but no isolation from the host. See ADR 0001.

## Later

tmux persistent shells and background processes, edit history and `undo_edit`, `find_and_edit`, Chromium + Playwright + VNC, per-Session directories and port blocks, the egress gateway, Cloudflare Containers and snapshots.
