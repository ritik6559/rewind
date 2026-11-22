import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { listFilesTool } from "@rewind/tools";
import { resolveInWorkspace } from "../paths.ts";
import type { ToolContext, ToolOutput } from "../types.ts";

const SKIPPED = new Set(["node_modules", ".git"]);
const DEPTH = 2;

async function walk(
  directory: string,
  prefix: string,
  depth: number,
  lines: string[],
) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIPPED.has(entry.name)) continue;
    const name = prefix + entry.name;
    lines.push(entry.isDirectory() ? `${name}/` : name);
    if (entry.isDirectory() && depth > 1) {
      await walk(join(directory, entry.name), `${name}/`, depth - 1, lines);
    }
  }
}

export async function listFiles(
  { path = "." }: (typeof listFilesTool.input)["infer"],
  { root }: ToolContext,
): Promise<ToolOutput> {
  const lines: string[] = [];
  await walk(resolveInWorkspace(root, path), "", DEPTH, lines);
  return { output: lines.length > 0 ? lines.join("\n") : "(empty directory)" };
}
