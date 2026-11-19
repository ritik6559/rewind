const apiKeyEnvVars: Record<string, string> = {
  openai: "OPENAI_API_KEY",
};

export function getEnvApiKey(provider: string): string | undefined {
  const envVar = apiKeyEnvVars[provider];
  return envVar ? process.env[envVar] : undefined;
}
