import { z } from 'zod';

/**
 * A number typed into an input arrives as a string, and a cleared input as an empty string, which
 * `z.coerce.number()` reads as 0. A cleared input reaches the schema as `undefined` instead, so
 * `z.number({ required_error })` rejects it and `z.number().optional()` allows it.
 *
 * Typed like `z.coerce.number()`, with the number as its input, so a form's values stay numbers
 * to the type system while a field holds what was typed.
 */
export function numberInput<T extends z.ZodTypeAny>(schema: T) {
  return z
    .union([z.string(), z.number(), z.undefined()])
    .transform(value => (value === '' || value === undefined ? undefined : Number(value)))
    .pipe(schema) as unknown as z.ZodType<z.output<T>, z.ZodTypeDef, z.output<T>>;
}
