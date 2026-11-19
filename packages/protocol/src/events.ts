import { type } from "arktype";
import {
  type EventPayload,
  type EventType,
  eventPayloadSchemas,
} from "./event-payloads.ts";

export const Actor = type("'user' | 'agent' | 'system'");
export type Actor = typeof Actor.infer;

export type NewEvent<T extends EventType = EventType> = {
  [K in T]: {
    type: K;
    actor: Actor;
    runId: string | null;
    parentId: string | null;
    payload: EventPayload<K>;
  };
}[T];

export type StoredEvent<T extends EventType = EventType> = NewEvent<T> & {
  id: string;
  sessionId: string;
  seq: number;
  ts: number;
};

const Envelope = type({
  id: "string",
  sessionId: "string",
  seq: "number.integer >= 1",
  ts: "number",
  type: "string",
  actor: Actor,
  runId: "string | null",
  parentId: "string | null",
  payload: "unknown",
});

export function isEventType(value: string): value is EventType {
  return Object.hasOwn(eventPayloadSchemas, value);
}

export function parseEvent(raw: unknown): StoredEvent {
  const event = Envelope.assert(raw);
  if (!isEventType(event.type))
    throw new Error(`Unknown event type: ${event.type}`);
  const payload = eventPayloadSchemas[event.type].assert(event.payload);
  return { ...event, payload } as StoredEvent;
}
