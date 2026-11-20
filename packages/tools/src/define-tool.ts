import type { ToolSpec } from "@rewind/protocol";
import type { Type } from "arktype";

export type ToolRunsIn = "sandbox" | "engine";

export type ToolDefinition<
  Input extends Record<string, unknown> = Record<string, unknown>,
> = ToolSpec & {
  runsIn: ToolRunsIn;
  input: Type<Input>;
};

export function defineTool<Input extends Record<string, unknown>>(tool: {
  name: string;
  description: string;
  runsIn: ToolRunsIn;
  input: Type<Input>;
}): ToolDefinition<Input> {
  const input = tool.input.onUndeclaredKey("delete") as Type<Input>;
  return {
    ...tool,
    input,
    inputJsonSchema: inputJsonSchemaOf(tool.name, input),
  };
}

function inputJsonSchemaOf(
  toolName: string,
  input: { toJsonSchema(): object },
): Record<string, unknown> {
  try {
    return { ...input.toJsonSchema() };
  } catch (error) {
    throw new Error(
      `Tool "${toolName}" has an input rule that JSON schema cannot show, so the model would not see it. Remove the .narrow() or transform from its input, or check that rule inside the tool.`,
      { cause: error },
    );
  }
}
