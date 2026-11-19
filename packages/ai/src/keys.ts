const apiKeyEnvVars: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  xai: "XAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

export function getEnvApiKey(provider: string): string | undefined {
  const envVar = apiKeyEnvVars[provider];
  return envVar ? process.env[envVar] : undefined;
}
