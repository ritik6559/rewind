const SECRET_PATTERN =
  /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})\b|Bearer\s+[A-Za-z0-9._~+/-]{20,}/g;

export function redactSecrets<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value).replace(SECRET_PATTERN, "[redacted]"),
  ) as T;
}
