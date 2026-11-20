import { ToolSpec } from "@rewind/protocol";
import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { defineTool, type ToolDefinition } from "../define-tool.ts";
import { anOpenFileTool } from "./define-tool.fixture.ts";

describe("defineTool", () => {
  it("keeps the name, description and where the tool runs", () => {
    const tool = anOpenFileTool();

    expect(tool).toMatchObject({
      name: "open_file",
      description: "Read a file from the workspace and return its contents.",
      runsIn: "sandbox",
    });
  });

  it("makes a tool that the model can take as a ToolSpec", () => {
    const spec: ToolSpec = anOpenFileTool();

    expect(ToolSpec.allows(spec)).toBe(true);
  });

  it("makes a JSON schema with each field, its description and the required fields", () => {
    const tool = anOpenFileTool();

    expect(tool.inputJsonSchema).toMatchObject({
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "the path from the repository root",
        },
        startLine: { type: "integer", minimum: 1 },
      },
      required: ["path"],
    });
  });

  it("tells the model that it must not add other fields", () => {
    const tool = anOpenFileTool();

    expect(tool.inputJsonSchema.additionalProperties).toBe(false);
  });

  it("accepts input that follows the schema", () => {
    const tool = anOpenFileTool();

    expect(tool.input({ path: "README.md", startLine: 3 })).toEqual({
      path: "README.md",
      startLine: 3,
    });
  });

  it("removes fields that the schema does not declare", () => {
    const tool = anOpenFileTool();

    expect(tool.input({ path: "README.md", reason: "to look" })).toEqual({
      path: "README.md",
    });
  });

  it("gives a readable error for input that breaks the schema", () => {
    const tool = anOpenFileTool();

    const result = tool.input({ startLine: 0 });

    expect(result).toBeInstanceOf(type.errors);
    expect(String(result)).toContain("path must be a string (was missing)");
    expect(String(result)).toContain("startLine must be at least 1 (was 0)");
  });

  it("throws with the tool name when the input has a custom check", () => {
    const defineWithNarrow = () =>
      defineTool({
        name: "open_file",
        description: "Read a file.",
        runsIn: "sandbox",
        input: type({ path: "string" }).narrow((input) => input.path !== ""),
      });

    expect(defineWithNarrow).toThrow('Tool "open_file" has an input rule');
  });

  it("throws with the tool name when the input has a transform", () => {
    const defineWithTransform = () =>
      defineTool({
        name: "shell_exec",
        description: "Run a command.",
        runsIn: "sandbox",
        input: type({ timeoutSeconds: "string.numeric.parse" }),
      });

    expect(defineWithTransform).toThrow('Tool "shell_exec" has an input rule');
  });

  it("lets tools with different inputs share one list", () => {
    const askUser = defineTool({
      name: "ask_user",
      description: "Ask the user a question.",
      runsIn: "engine",
      input: type({ question: "string" }),
    });

    const tools: ToolDefinition[] = [anOpenFileTool(), askUser];

    expect(tools.map((tool) => tool.runsIn)).toEqual(["sandbox", "engine"]);
  });
});
