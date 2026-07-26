export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retries an async operation with exponential backoff + jitter.
 * By default retries on network errors, timeouts, rate limits (429), and 5xx responses.
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 800,
    maxDelayMs = 15000,
    isRetryable = defaultIsRetryable,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      onRetry?.(attempt + 1, error);
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * exponential * 0.3;
      await sleep(exponential + jitter);
    }
  }

  throw lastError;
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 429 || error.status >= 500;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('econnreset') || msg.includes('fetch failed');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
