import { baseScope } from "../base.scope.ts";
import {
  type EventPayload,
  type EventType,
  eventPayloadSchemas,
} from "./event-payloads.scope.ts";

const NewEventFields = baseScope.type({
  runId: "runId | null",
  causedByEventId: baseScope.type("eventId | null").configure({
    description: "the id of the event that caused this one, or null",
  }),
});

const StoredEventFields = baseScope.type({
  id: "eventId",
  sessionId: "sessionId",
  seq: "seq",
  ts: "epochMs",
});

export type NewEvent<T extends EventType = EventType> = {
  [K in T]: typeof NewEventFields.infer & {
    type: K;
    payload: EventPayload<K>;
  };
}[T];

export type StoredEvent<T extends EventType = EventType> = NewEvent<T> &
  typeof StoredEventFields.infer;

const Envelope = NewEventFields.merge(StoredEventFields)
  .merge({ type: "string", payload: "unknown" })
  .onDeepUndeclaredKey("reject");

const strictPayloadSchemas = new Map(
  Object.entries(eventPayloadSchemas).map(([eventType, schema]) => [
    eventType,
    schema.onDeepUndeclaredKey("reject"),
  ]),
);

export function isEventType(value: string): value is EventType {
  return Object.hasOwn(eventPayloadSchemas, value);
}

export function parseEvent(raw: unknown): StoredEvent {
  const event = Envelope.assert(raw);
  const payloadSchema = strictPayloadSchemas.get(event.type);
  if (!payloadSchema) throw new Error(`Unknown event type: ${event.type}`);
  const payload = payloadSchema.assert(event.payload);
  return { ...event, payload } as StoredEvent;
}
