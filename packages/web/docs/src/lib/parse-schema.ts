import { ZodError, ZodType, ZodTypeDef } from 'zod';

/**
 * Throws a readable error if the value does not conform to the given Zod schema.
 */
export function parseSchema<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>(
  value: unknown,
  schema: ZodType<TOutput, TDef, TInput>,
): TOutput {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      'Failed to parse\n' +
        prettifyZodError(result.error) +
        '\nin object:\n' +
        JSON.stringify(value, null, 2),
    );
  }

  return result.data;
}

/**
 * Remove this when updating to Zod 4.x, as it's included as .prettifyError()
 */
export function prettifyZodError(err: ZodError) {
  const pretty = err.issues
    .map(issue => {
      const lines = [];
      lines.push(`🔥 ${issue.message}`);
      if (issue.path.length > 0) {
        lines.push(`    → at ${issue.path.join('.')}`);
      }
      return lines.join('\n');
    })
    .join('\n');

  return pretty;
}
