import { type ChildProcess, spawn } from "node:child_process";
import type { shellExecTool } from "@rewind/tools";
import type { ToolContext, ToolOutput } from "../types.ts";

const DEFAULT_TIMEOUT_SEC = 120;
const MAX_OUTPUT_CHARS = 200_000;

function killTree(child: ChildProcess) {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"]);
    return;
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
}

export function runShell(
  {
    command,
    timeoutSec = DEFAULT_TIMEOUT_SEC,
  }: (typeof shellExecTool.input)["infer"],
  { root, signal, onOutput }: ToolContext,
): Promise<ToolOutput> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: root,
      detached: process.platform !== "win32",
    });
    let output = "";
    let stoppedBecause = "";

    const stop = (reason: string) => {
      if (stoppedBecause) return;
      stoppedBecause = reason;
      killTree(child);
    };
    const onChunk = (chunk: string) => {
      if (stoppedBecause) return;
      output += chunk;
      onOutput(chunk);
      if (output.length > MAX_OUTPUT_CHARS) stop("output limit reached");
    };
    const timer = setTimeout(
      () => stop(`timed out after ${timeoutSec}s`),
      timeoutSec * 1000,
    );
    const onAbort = () => stop("cancelled");
    signal.addEventListener("abort", onAbort, { once: true });
    const cleanUp = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    child.stdout.setEncoding("utf8").on("data", onChunk);
    child.stderr.setEncoding("utf8").on("data", onChunk);
    child.on("error", (error) => {
      cleanUp();
      resolve({ output: error.message, isError: true });
    });
    child.on("close", (exitCode) => {
      cleanUp();
      resolve({
        output: stoppedBecause ? `${output}\n[${stoppedBecause}]` : output,
        isError: exitCode !== 0,
        ...(exitCode !== null && { exitCode }),
      });
    });
  });
}
