import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const finishTool = defineTool({
  name: "finish",
  description:
    "End the run when the task is done. The summary is shown to the user.",
  runsIn: "engine",
  input: type({
    summary: type("string > 0").configure({
      description: "what was done and what the user should know",
    }),
  }),
});
