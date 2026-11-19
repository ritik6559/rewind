import { writeFile } from "node:fs/promises";
import type { Model } from "../src/types.ts";

type ModelsDevModel = {
  id: string;
  tool_call?: boolean;
  reasoning?: boolean;
  status?: string;
  modalities?: { output?: string[] };
  limit?: { context: number; output: number };
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
};

const baseUrls: Record<string, string> = {
  openai: "https://api.openai.com/v1",
};

const response = await fetch("https://models.dev/api.json");
if (!response.ok) throw new Error(`models.dev returned ${response.status}`);
const providers = (await response.json()) as Record<
  string,
  { models: Record<string, ModelsDevModel> }
>;

const models: Model[] = [];

for (const [provider, baseUrl] of Object.entries(baseUrls)) {
  const providerData = providers[provider];
  if (!providerData)
    throw new Error(`models.dev has no provider "${provider}"`);

  for (const model of Object.values(providerData.models)) {
    if (!model.tool_call || !model.limit || model.status === "deprecated")
      continue;
    if (!model.modalities?.output?.includes("text")) continue;

    models.push({
      id: model.id,
      provider,
      api: "openai-completions",
      baseUrl,
      contextWindow: model.limit.context,
      maxOutputTokens: model.limit.output,
      pricePerMillionTokens: {
        input: model.cost?.input ?? 0,
        output: model.cost?.output ?? 0,
        cacheRead: model.cost?.cache_read ?? 0,
        cacheWrite: model.cost?.cache_write ?? 0,
      },
      supportsReasoning: model.reasoning ?? false,
    });
  }
}

const file = `import type { Model } from "../types.ts";

export const generatedModels: Model[] = ${JSON.stringify(models, null, 2)};
`;

await writeFile(new URL("../src/models/generated.ts", import.meta.url), file);
console.log(`Wrote ${models.length} models`);
