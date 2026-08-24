const SENSITIVE_KEY =
  /(?:pass(word)?|secret|token|api[_-]?key|private[_-]?key|credential|authorization|cookie|session)/i;

export function isSensitiveEnvKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function redactEnv(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }
    out[key] = isSensitiveEnvKey(key) ? '[redacted]' : value;
  }
  return out;
}
