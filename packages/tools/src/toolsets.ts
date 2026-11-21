import type { ToolDefinition } from "./define-tool.ts";
import { createFileTool } from "./editor/create-file.ts";
import { listFilesTool } from "./editor/list-files.ts";
import { openFileTool } from "./editor/open-file.ts";
import { strReplaceTool } from "./editor/str-replace.ts";
import { shellExecTool } from "./shell/shell-exec.ts";
import { askUserTool } from "./user/ask-user.ts";
import { finishTool } from "./user/finish.ts";

export const coreTools: ToolDefinition[] = [
  shellExecTool,
  listFilesTool,
  openFileTool,
  createFileTool,
  strReplaceTool,
  askUserTool,
  finishTool,
];
