import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const createFileTool = defineTool({
  name: "create_file",
  description:
    "Create a file with the given content. Fails if the file already exists, unless overwrite is true.",
  runsIn: "sandbox",
  input: type({
    path: type("string > 0").configure({
      description: "the path from the workspace root",
    }),
    content: "string",
    "overwrite?": type("boolean").configure({
      description: "replace the file if it exists, false if not set",
    }),
  }),
});
