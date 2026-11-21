# tools (`packages/tools`)

Tool definitions: name, description, ArkType input schema, and where the tool runs. It defines tools; it does not run them. Sandbox tools are run by `sandboxd`, engine tools by the engine.

## Exists

- `defineTool({ name, description, runsIn, input })`: drops undeclared input keys, and builds the JSON Schema the model sees. It throws if a schema rule can't be shown in JSON Schema, so the model never gets a rule it can't see.
- `runsIn`: `"sandbox"` (runs in `sandboxd`) or `"engine"` (runs in the engine, may use credentials).
- Placeholder files for every planned tool (shell, editor, browser, git, user).

## MVP tools

| Tool | Runs in | Input | Behaviour |
|---|---|---|---|
| `shell_exec` | sandbox | `command`, `timeoutSec = 120` | One-shot `bash -lc` in `/workspace`. Streams stdout and stderr. Returns exit code and trimmed output. On timeout, kills it and returns partial output. |
| `list_files` | sandbox | `path?` | Files and folders two levels deep, skipping `node_modules` and `.git`. |
| `open_file` | sandbox | `path`, `startLine?`, `endLine?` | Numbered lines of a file, at most 400 per call. Files only. |
| `create_file` | sandbox | `path`, `content`, `overwrite = false` | Fails if the file exists, unless `overwrite`. |
| `str_replace` | sandbox | `path`, `old_str`, `new_str` | Needs exactly one match. Returns the edited region with 4 lines of context. |
| `ask_user` | engine | `question`, `suggestedAnswers?` | Pauses the Run until the user answers. |
| `finish` | engine | `summary` | Ends the Run as completed. |

All paths are relative to the Workspace root; `sandboxd` rejects paths that leave it.

A `toolsets.ts` export lists these seven as the MVP toolset.

## Later

`shell_start|read|input|kill` (tmux, background processes), `undo_edit`, `find_and_edit`, `search`, browser tools, GitHub tools, `message_user`, approval rules and read-only flags per tool.
