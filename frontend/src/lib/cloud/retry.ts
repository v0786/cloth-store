export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number },
) {
  const attempts = opts?.attempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 300;
  const maxDelayMs = opts?.maxDelayMs ?? 4000;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

