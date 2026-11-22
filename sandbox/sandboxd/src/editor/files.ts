import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  createFileTool,
  openFileTool,
  strReplaceTool,
} from "@rewind/tools";
import { resolveInWorkspace } from "../paths.ts";
import type { ToolContext, ToolOutput } from "../types.ts";

const MAX_LINES_PER_CALL = 400;
const CONTEXT_LINES = 4;

type Input<T extends { input: { infer: unknown } }> = T["input"]["infer"];

const numbered = (lines: string[], from: number, to: number) =>
  lines
    .slice(from - 1, to)
    .map((line, index) => `${from + index}\t${line}`)
    .join("\n");

const errorOutput = (output: string): ToolOutput => ({ output, isError: true });

export async function openFile(
  { path, startLine = 1, endLine }: Input<typeof openFileTool>,
  { root }: ToolContext,
): Promise<ToolOutput> {
  const absolute = resolveInWorkspace(root, path);
  if ((await stat(absolute)).isDirectory()) {
    return errorOutput(`${path} is a directory. Use list_files.`);
  }
  const lines = (await readFile(absolute, "utf8")).split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (startLine > lines.length) {
    return errorOutput(`${path} has only ${lines.length} lines.`);
  }
  if (endLine !== undefined && endLine < startLine) {
    return errorOutput("endLine must not be before startLine.");
  }
  const last = Math.min(
    endLine ?? lines.length,
    startLine + MAX_LINES_PER_CALL - 1,
    lines.length,
  );
  const footer =
    last < lines.length
      ? `\n[showing lines ${startLine}-${last} of ${lines.length}]`
      : "";
  return { output: numbered(lines, startLine, last) + footer };
}

export async function createFile(
  { path, content, overwrite = false }: Input<typeof createFileTool>,
  { root }: ToolContext,
): Promise<ToolOutput> {
  const absolute = resolveInWorkspace(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    await writeFile(absolute, content, { flag: overwrite ? "w" : "wx" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return errorOutput(
        `${path} already exists. Set overwrite to true to replace it.`,
      );
    }
    throw error;
  }
  return { output: `Created ${path}.` };
}

export async function strReplace(
  { path, oldString, newString }: Input<typeof strReplaceTool>,
  { root }: ToolContext,
): Promise<ToolOutput> {
  const absolute = resolveInWorkspace(root, path);
  const text = await readFile(absolute, "utf8");
  const matches = text.split(oldString).length - 1;
  if (matches === 0) return errorOutput(`oldString was not found in ${path}.`);
  if (matches > 1) {
    return errorOutput(
      `oldString matches ${matches} times in ${path}. Add more surrounding lines so it matches once.`,
    );
  }
  const index = text.indexOf(oldString);
  const updated =
    text.slice(0, index) + newString + text.slice(index + oldString.length);
  await writeFile(absolute, updated);

  const startLine = updated.slice(0, index).split("\n").length;
  const endLine = startLine + newString.split("\n").length - 1;
  const lines = updated.split("\n");
  const snippet = numbered(
    lines,
    Math.max(1, startLine - CONTEXT_LINES),
    Math.min(lines.length, endLine + CONTEXT_LINES),
  );
  return { output: `Edited ${path}:\n${snippet}` };
}
