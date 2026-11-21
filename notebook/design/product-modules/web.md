# web (`apps/web`)

The page the user and the evaluators see. Vite + React, served by `apps/server`. It should look simple and polished, like a coding agent.

## MVP design

**Layout:**
- **Sidebar:** past Sessions (from `GET /api/sessions`) and a "New session" button.
- **Header:** status pill (`idle`, `running`, `waiting_for_user`, `error`), the current Run's cost, and a Stop button while running.
- **Timeline:** one card per Event, in `seq` order:
  - user and agent messages; agent text streams in from deltas;
  - tool calls as collapsible cards with the input, live output while running, then the final output and exit code;
  - rejected tool input shown as a small warning;
  - a question card with suggested answers and a reply box while `waiting_for_user`;
  - Run end shown as a divider (completed, failed with its reason, or cancelled).
- **Composer:** a message box at the bottom.

**Data:** one WebSocket per open Session. The client keeps the last `seq` it has and calls `subscribe(lastSeq)` on reconnect, so a reload or dropped connection loses nothing. Session state on screen is derived from the Events.

## Nice to have (only if time is left)

A "Changes" card with `git diff` at the end of a Run.

## Out of scope

Terminal pane, browser pane, diff viewer, trace view, login, repo picker, model picker.
