/**
 * Retries an async function with exponential backoff + jitter.
 * Handles 429 (quota) and 503 (overload) from Gemini gracefully.
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 20000,
    factor = 2,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      const isRetryable = status === 429 || status === 503;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Respect Retry-After header if present (Gemini sends this on 429)
      const retryAfterHeader = error?.headers?.['retry-after'];
      const waitMs = retryAfterHeader
        ? parseInt(retryAfterHeader) * 1000
        : Math.min(delay + Math.random() * 500, maxDelayMs); // add jitter

      console.warn(`[Retry] Attempt ${attempt + 1} failed (status ${status}). Waiting ${waitMs}ms...`);
      await sleep(waitMs);

      delay *= factor;
      attempt++;
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
