import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const anOpenFileTool = () =>
  defineTool({
    name: "open_file",
    description: "Read a file from the workspace and return its contents.",
    runsIn: "sandbox",
    input: type({
      path: type("string").configure({
        description: "the path from the repository root",
      }),
      "startLine?": "number.integer >= 1",
    }),
  });
