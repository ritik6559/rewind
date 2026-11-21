# runtime-memory (`packages/runtime-memory`)

In-memory adapters of the engine's `Runtime` ports, for tests. Nothing touches disk, network or real time.

## Exists

- `createMemoryRuntime(toolsByName)`: a memory Event store, a fake sandbox, the real `stream` (use the `faux` model for tests), a frozen clock and counter IDs.
- `createMemoryEventStore`: append-only, assigns `seq`, `id` and `ts`.
- `createFakeSandbox`: records every call and answers with scripted fake tools; an unknown tool returns an error result that says how to add it.
- `createFrozenClock`, `createCounterIds`, `MEMORY_SESSION_ID`.
- Unit tests for the Event store and fake sandbox.

## MVP changes

- The fake sandbox accepts the new optional `onOutput(chunk)` callback on `callTool`, so the engine's streaming path can be tested.

## Later

Engine scenario tests on top of it (one per loop branch: tool call, rejected input, ask_user, Stop, limit reached).
