import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const askUserTool = defineTool({
  name: "ask_user",
  description:
    "Ask the user a question and wait for the answer. Use it only when the task cannot go on without a decision that you cannot make yourself.",
  runsIn: "engine",
  input: type({
    question: "string > 0",
    "suggestedAnswers?": "string[]",
  }),
});
