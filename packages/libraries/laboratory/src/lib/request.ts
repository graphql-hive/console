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
