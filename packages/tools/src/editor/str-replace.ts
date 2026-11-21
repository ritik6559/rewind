import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const strReplaceTool = defineTool({
  name: "str_replace",
  description:
    "Replace one piece of text in a file. Fails unless oldString matches exactly once, so include enough surrounding lines to make it unique.",
  runsIn: "sandbox",
  input: type({
    path: type("string > 0").configure({
      description: "the path from the workspace root",
    }),
    oldString: type("string > 0").configure({
      description: "the exact text to replace, including whitespace",
    }),
    newString: "string",
  }),
});
