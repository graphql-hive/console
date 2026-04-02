export function createRequestSignal(
  signal?: AbortSignal,
  timeout?: number,
): AbortSignal | undefined {
  if (typeof timeout === 'number' && timeout > 0) {
    return signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
      : AbortSignal.timeout(timeout);
  }

  return signal;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  retryCount = 0,
): Promise<Response> {
  let attempt = 0;

  while (true) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= retryCount) {
        throw error;
      }

      attempt++;
    }
  }
}
