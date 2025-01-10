import { Static, TAnySchema } from '@sinclair/typebox';
import { AssertError, Value, ValueError, ValueErrorType } from '@sinclair/typebox/value';

export * from '@sinclair/typebox/value';

export * from './materialized-value-error';

/**
 * Non-throwing version of {@link ParseJson}.
 *
 * If JSON parsing fails then {@link TypeBoxError} is returned.
 * Otherwise its just the regular {@link Value.Parse} error of type {@link AssertError}.
 */
export const ParseJsonSafe = <$Type extends TAnySchema>(
  type: $Type,
  jsonString: string,
): Static<$Type> | AssertError => {
  try {
    return ParseJson(type, jsonString);
  } catch (e) {
    return e;
  }
};

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
    const error = e as Error;
    const message = `Failed to parse contents of given JSON because the JSON itself was invalid: ${error.message}`;
    const valueError: ValueError = {
      value: jsonString,
      type: ValueErrorType.StringFormat,
      message,
      path: '',
      errors: [],
      schema: type,
    };

    throw new AssertError(new Value.ValueErrorIterator([valueError][Symbol.iterator]()));
  }

  return Value.Parse(type, rawData);
};
