import { Static, TAnySchema, TypeBoxError } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export * from '@sinclair/typebox/value';
export * from './materialized-value-error';

/**
 * Parses a JSON string and validates it against a TypeBox schema
 *
 * @returns The parsed and typed value
 *
 * @throwsError {@link TypeBoxError} If JSON parsing fails or if validation fails
 */
export const ParseJson = <$Type extends TAnySchema>(
  /**
   * The TypeBox schema to validate against
   */
  type: $Type,
  /**
   * The JSON string to parse
   */
  jsonString: string,
): Static<$Type> => {
  let rawData: unknown;
  try {
    rawData = JSON.parse(jsonString);
  } catch (e) {
    throw new TypeBoxError(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  return Value.Parse(type, rawData);
};
