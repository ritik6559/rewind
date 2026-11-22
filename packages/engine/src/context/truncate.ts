export function truncateOutput(text: string, maxChars = 8_000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2);
  const omitted = text.length - half * 2;
  return `${text.slice(0, half)}\n[... ${omitted} characters omitted ...]\n${text.slice(text.length - half)}`;
}
