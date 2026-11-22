import type { Message, StoredEvent, ToolResultMessage } from "@rewind/protocol";

const toolResultMessage = (
  toolCallId: string,
  toolName: string,
  text: string,
  isError: boolean,
): ToolResultMessage => ({
  role: "toolResult",
  toolCallId,
  toolName,
  isError,
  content: [{ type: "text", text }],
});

export function buildMessages(events: StoredEvent[]): Message[] {
  const messages: Message[] = [];
  let askUserCallId: string | null = null;

  for (const event of events) {
    switch (event.type) {
      case "user.message_sent":
        messages.push({ role: "user", content: event.payload.text });
        break;
      case "model.response_received":
        messages.push(event.payload.assistantMessage);
        break;
      case "tool.call_started":
        if (event.payload.toolName === "ask_user") {
          askUserCallId = event.payload.toolCallId;
        }
        break;
      case "tool.call_finished": {
        const { toolCallId, toolName, output, isError } = event.payload;
        messages.push(toolResultMessage(toolCallId, toolName, output, isError));
        break;
      }
      case "tool.input_rejected": {
        const { toolCallId, toolName, validationError } = event.payload;
        messages.push(
          toolResultMessage(toolCallId, toolName, validationError, true),
        );
        break;
      }
      case "user.question_answered": {
        const { answer } = event.payload;
        messages.push(
          askUserCallId
            ? toolResultMessage(askUserCallId, "ask_user", answer, false)
            : { role: "user", content: answer },
        );
        askUserCallId = null;
        break;
      }
      case "run.cancelled":
        if (askUserCallId) {
          messages.push(
            toolResultMessage(
              askUserCallId,
              "ask_user",
              "The user stopped the run before answering.",
              true,
            ),
          );
          askUserCallId = null;
        }
        break;
      default:
        break;
    }
  }

  return messages;
}
