import type { Model } from "../types.ts";
import { generatedModels } from "./generated.ts";

export function getModel(provider: string, id: string): Model | undefined {
  return generatedModels.find(
    (model) => model.provider === provider && model.id === id,
  );
}

export function getModels(provider?: string): Model[] {
  return provider
    ? generatedModels.filter((model) => model.provider === provider)
    : [...generatedModels];
}
