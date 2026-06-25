export async function retry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; delayMs?: number; factor?: number; shouldRetry?: (error: unknown) => boolean } = {}
): Promise<T> {
  const retries = options.retries ?? 3;
  const factor = options.factor ?? 2;
  let delayMs = options.delayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = options.shouldRetry ? options.shouldRetry(error) : true;
      if (!retryable || attempt === retries) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= factor;
    }
  }

  throw lastError;
}
