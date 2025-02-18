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

export const oneOf = <type extends readonly unknown[]>(
  ...guards: OneOfCheck<type>
): ((value: unknown) => type[number]) => {
  return (value: unknown) => {
    for (const guard of guards) {
      if (guard(value)) {
        return value;
      }
    }
    throw new Error(`Unexpected value received by oneOf: ${value}`);
  };
};

type OneOfCheck<types extends readonly unknown[]> = {
  [index in keyof types]: (value: unknown) => value is types[index];
};
