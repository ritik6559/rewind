import { describe, expect, it } from "vitest";
import { coreTools } from "../toolsets.ts";

const toolNamed = (name: string) => {
  const tool = coreTools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`No core tool named ${name}`);
  return tool;
};

describe("coreTools", () => {
  it("has the seven MVP tools, each name once", () => {
    expect(coreTools.map((tool) => tool.name)).toEqual([
      "shell_exec",
      "list_files",
      "open_file",
      "create_file",
      "str_replace",
      "ask_user",
      "finish",
    ]);
  });

  it("runs ask_user and finish in the engine and the rest in the sandbox", () => {
    const engineTools = coreTools
      .filter((tool) => tool.runsIn === "engine")
      .map((tool) => tool.name);

    expect(engineTools).toEqual(["ask_user", "finish"]);
  });

  it("rejects an empty command", () => {
    const result = toolNamed("shell_exec").input({ command: "" });

    expect(result).toHaveProperty("issues");
  });

  it("rejects a str_replace that has nothing to find", () => {
    const result = toolNamed("str_replace").input({
      path: "a.ts",
      oldString: "",
      newString: "x",
    });

    expect(result).toHaveProperty("issues");
  });
});
