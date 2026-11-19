import type { AssistantMessage } from "@rewind/protocol";
import { type AssistantMessageEvent, isFinalEvent } from "./events.ts";

export class AssistantMessageEventStream
  implements AsyncIterable<AssistantMessageEvent>
{
  private events: AssistantMessageEvent[] = [];
  private wakeReader: (() => void) | null = null;
  private finished = false;
  private hasReader = false;

  private resolveFinalMessage!: (message: AssistantMessage) => void;
  private readonly finalMessage: Promise<AssistantMessage>;

  constructor() {
    this.finalMessage = new Promise((resolve) => {
      this.resolveFinalMessage = resolve;
    });
  }

  push(event: AssistantMessageEvent): void {
    if (this.finished) {
      return;
    }

    this.events.push(event);

    if (isFinalEvent(event)) {
      this.finished = true;
      this.resolveFinalMessage(event.message);
    }

    this.wakeReader?.();
    this.wakeReader = null;
  }

  result(): Promise<AssistantMessage> {
    return this.finalMessage;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<AssistantMessageEvent> {
    if (this.hasReader) {
      throw new Error("AssistantMessageEventStream supports only one reader");
    }

    this.hasReader = true;

    while (true) {
      const event = this.events.shift();
      if (!event) {
        await new Promise<void>((resolve) => {
          this.wakeReader = resolve;
        });

        continue;
      }

      yield event;
      if (isFinalEvent(event)) {
        return;
      }
    }
  }
}
