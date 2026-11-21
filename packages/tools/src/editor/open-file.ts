import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const openFileTool = defineTool({
  name: "open_file",
  description:
    "Show a file with numbered lines, at most 400 lines per call. To see what is inside a directory, use list_files.",
  runsIn: "sandbox",
  input: type({
    path: type("string > 0").configure({
      description: "the path from the workspace root",
    }),
    "startLine?": type("number.integer >= 1").configure({
      description: "the first line to show, 1 if not set",
    }),
    "endLine?": type("number.integer >= 1").configure({
      description: "the last line to show",
    }),
  }),
});
