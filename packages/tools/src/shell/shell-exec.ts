import { type } from "arktype";
import { defineTool } from "../define-tool.ts";

export const shellExecTool = defineTool({
  name: "shell_exec",
  description:
    "Run a bash command in the workspace root and return its exit code and output. Each call starts a fresh shell, so cd and exported variables do not carry over. Long output is cut to its start and end.",
  runsIn: "sandbox",
  input: type({
    command: type("string > 0").configure({
      description: "the bash command to run",
    }),
    "timeoutSec?": type("1 <= number.integer <= 600").configure({
      description: "seconds before the command is killed, 120 if not set",
    }),
  }),
});
