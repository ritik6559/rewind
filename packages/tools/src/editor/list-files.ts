import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const listFilesTool = defineTool({
  name: "list_files",
  description:
    "List the files and folders inside a directory, two levels deep. Folders such as node_modules and .git are left out.",
  runsIn: "sandbox",
  input: type({
    "path?": type("string > 0").configure({
      description: "the directory from the workspace root, the root if not set",
    }),
  }),
});
