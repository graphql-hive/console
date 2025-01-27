export const tryOr = <$PrimaryResult, $FallbackResult>(
  fn: () => $PrimaryResult,
  fallback: () => $FallbackResult,
): $PrimaryResult | $FallbackResult => {
  try {
    return fn();
  } catch {
    return fallback();
  }
};
