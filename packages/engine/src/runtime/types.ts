import type { stream } from "@rewind/ai";
import type {
  EventId,
  EventType,
  NewEvent,
  QuestionId,
  RunId,
  StoredEvent,
  ToolCall,
  ToolResult,
} from "@rewind/protocol";

export type StreamModel = typeof stream;

export type Clock = { now(): number };

export type IdGenerator = {
  newEventId(): EventId;
  newRunId(): RunId;
  newQuestionId(): QuestionId;
};

export type EventStore = {
  append<T extends EventType>(event: NewEvent<T>): StoredEvent<T>;
  read(afterSeq?: number): StoredEvent[];
};

export type SandboxClient = {
  callTool(
    toolCall: ToolCall,
    signal: AbortSignal,
    onOutput?: (chunk: string) => void,
  ): Promise<ToolResult>;
};

export type Runtime = {
  events: EventStore;
  sandbox: SandboxClient;
  streamModel: StreamModel;
  clock: Clock;
  ids: IdGenerator;
};
