/**
 * Look up a value in the environment if the given value is undefined or null.
 */
export const orEnvar = <$Value>(
  value: $Value,
  envarName: string,
): Exclude<$Value, null | undefined> | string | null => {
  if (value !== null && value !== undefined) return value as any;

  // eslint-disable-next-line no-process-env
  if (envarName && process.env[envarName]) {
    // eslint-disable-next-line no-process-env
    return process.env[envarName];
  }

  return null;
};
