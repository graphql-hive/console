import type { ZodSafeParseResult } from 'zod';

export function extractConfig<Output>(config: ZodSafeParseResult<Output>): Output {
  if (!config.success) {
    throw new Error('Something went wrong.');
  }
  return config.data;
}
