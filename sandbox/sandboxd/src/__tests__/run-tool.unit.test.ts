import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runToolCall } from "../run-tool.ts";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sandboxd-"));
});

const call = (
  toolName: string,
  input: Record<string, unknown>,
  onOutput: (chunk: string) => void = () => {},
) =>
  runToolCall(
    { toolCallId: "call_1", toolName, input },
    { root, signal: new AbortController().signal, onOutput },
  );

describe("open_file", () => {
  it("numbers the lines", async () => {
    writeFileSync(join(root, "a.ts"), "one\ntwo\nthree\n");

    const result = await call("open_file", { path: "a.ts", startLine: 2 });

    expect(result.output).toBe("2\ttwo\n3\tthree");
  });

  it("shows at most 400 lines and says how many are left", async () => {
    writeFileSync(join(root, "big.txt"), "x\n".repeat(500));

    const result = await call("open_file", { path: "big.txt" });

    expect(result.output.split("\n")).toHaveLength(401);
    expect(result.output).toContain("[showing lines 1-400 of 500]");
  });

  it("points to list_files for a directory", async () => {
    const result = await call("open_file", { path: "." });

    expect(result).toMatchObject({ isError: true });
    expect(result.output).toContain("list_files");
  });

  it("refuses a path outside the workspace", async () => {
    const result = await call("open_file", { path: "../secret.txt" });

    expect(result).toMatchObject({
      isError: true,
      output: 'Path "../secret.txt" is outside the workspace.',
    });
  });
});

describe("create_file", () => {
  it("creates the file and its folders", async () => {
    await call("create_file", { path: "src/new.ts", content: "hi" });

    expect(readFileSync(join(root, "src/new.ts"), "utf8")).toBe("hi");
  });

  it("will not replace a file unless overwrite is true", async () => {
    writeFileSync(join(root, "a.ts"), "old");

    const refused = await call("create_file", { path: "a.ts", content: "new" });
    await call("create_file", {
      path: "a.ts",
      content: "new",
      overwrite: true,
    });

    expect(refused.isError).toBe(true);
    expect(readFileSync(join(root, "a.ts"), "utf8")).toBe("new");
  });
});

describe("str_replace", () => {
  it("replaces one match and shows the edited lines", async () => {
    writeFileSync(join(root, "a.ts"), "a\nreturn 1\nb\n");

    const result = await call("str_replace", {
      path: "a.ts",
      oldString: "return 1",
      newString: "return 2",
    });

    expect(readFileSync(join(root, "a.ts"), "utf8")).toBe("a\nreturn 2\nb\n");
    expect(result.output).toBe("Edited a.ts:\n1\ta\n2\treturn 2\n3\tb\n4\t");
  });

  it("fails when the text is not found or matches twice", async () => {
    writeFileSync(join(root, "a.ts"), "x\nx\n");

    const missing = await call("str_replace", {
      path: "a.ts",
      oldString: "y",
      newString: "z",
    });
    const twice = await call("str_replace", {
      path: "a.ts",
      oldString: "x",
      newString: "z",
    });

    expect(missing.output).toContain("not found");
    expect(twice.output).toContain("matches 2 times");
    expect(readFileSync(join(root, "a.ts"), "utf8")).toBe("x\nx\n");
  });
});

describe("list_files", () => {
  it("lists two levels and skips node_modules and .git", async () => {
    mkdirSync(join(root, "src/deep/deeper"), { recursive: true });
    mkdirSync(join(root, "node_modules/pkg"), { recursive: true });
    mkdirSync(join(root, ".git"));
    writeFileSync(join(root, "README.md"), "");
    writeFileSync(join(root, "src/a.ts"), "");
    writeFileSync(join(root, "src/deep/b.ts"), "");

    const result = await call("list_files", {});

    expect(result.output.split("\n")).toEqual([
      "README.md",
      "src/",
      "src/a.ts",
      "src/deep/",
    ]);
  });
});

describe("shell_exec", () => {
  it("streams output and returns the exit code", async () => {
    const chunks: string[] = [];

    const result = await call(
      "shell_exec",
      { command: "echo hello" },
      (chunk) => chunks.push(chunk),
    );

    expect(chunks.join("")).toBe("hello\n");
    expect(result).toMatchObject({
      output: "hello\n",
      isError: false,
      exitCode: 0,
    });
  });

  it("marks a failing command as an error", async () => {
    const result = await call("shell_exec", {
      command: "echo oops >&2; exit 3",
    });

    expect(result).toMatchObject({
      output: "oops\n",
      isError: true,
      exitCode: 3,
    });
  });

  it("runs in the workspace root", async () => {
    writeFileSync(join(root, "marker.txt"), "");

    const result = await call("shell_exec", { command: "ls" });

    expect(result.output).toContain("marker.txt");
  });

  it("kills a command that runs past its timeout", async () => {
    const result = await call("shell_exec", {
      command: "sleep 10",
      timeoutSec: 1,
    });

    expect(result.isError).toBe(true);
    expect(result.output).toContain("[timed out after 1s]");
  });

  it("ignores a cancel that arrives after the command ended", async () => {
    const controller = new AbortController();
    const result = await runToolCall(
      {
        toolCallId: "call_1",
        toolName: "shell_exec",
        input: { command: "true" },
      },
      { root, signal: controller.signal, onOutput: () => {} },
    );

    expect(() => controller.abort()).not.toThrow();
    expect(result.isError).toBe(false);
  });
});

describe("validation", () => {
  it("rejects bad input and unknown tools without throwing", async () => {
    const badInput = await call("shell_exec", { command: "" });
    const unknown = await call("nope", {});

    expect(badInput.isError).toBe(true);
    expect(unknown).toMatchObject({
      isError: true,
      output: 'Unknown tool "nope".',
    });
  });
});
