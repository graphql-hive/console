import { Errors } from '../helpers/errors';
import { neverCatch, neverUndefined } from '../helpers/general';
import { T } from '../helpers/typebox/_namespace';
import { CaseDefinition } from './case-definition';
import { Result } from './result';

// ---------------------------------
// Definition
// ---------------------------------

export interface Definition<$CaseDefinitions extends CaseDefinition[] = CaseDefinition[]> {
  caseDefinitions: $CaseDefinitions;
}

export const define = <$CaseDefinitions extends CaseDefinition[]>(
  ...caseDefinitions: $CaseDefinitions
): Definition<$CaseDefinitions> => {
  return {
    caseDefinitions,
  };
};

// ---------------------------------
// Parse
// ---------------------------------

/**
 * Parse a result.
 *
 * @returns
 *
 * - A copy of the result with defaults, if any, applied.
 * - The matched case definition.
 *
 * @throws ...
 *
 * {@link Errors.Failure} if the result shape does not fit the Definition schema.
 */
export const parseOrThrow = (definition: Definition, resultInit: object) => {
  const schema: T.TSchema = getSchema(definition);
  let result: Result;
  try {
    result = T.Value.Parse(schema, resultInit);
  } catch (error) {
    if (!(error instanceof T.Value.AssertError)) neverCatch(error);

    // todo: Make it easier for the Hive team to be alerted.
    // - Alert the Hive team automatically with some opt-in telemetry?
    // - A single-click-link with all relevant variables serialized into search parameters?
    const errorMessage = `Whoops. This Hive CLI command tried to output a value that violates its own schema. This should never happen. Please report this error to the Hive team at https://github.com/graphql-hive/console/issues/new.`;
    throw new Errors.Failure({
      message: errorMessage,
      data: {
        type: 'ErrorInternalOutputSchemaViolation',
        message: errorMessage,
        value: resultInit,
        errors: T.Value.MaterializeValueErrorIterator(error.Errors()),
      },
    });
  }

  const caseDefinition = definition.caseDefinitions.find(
    caseDefinition =>
      caseDefinition.schema.properties.data.properties.type.const === result.data.type,
  );
  if (!caseDefinition) neverUndefined(); // `result` was validated, so a case definition will always be found.

  return {
    result,
    caseDefinition,
  };
};

// ---------------------------------
// Get Schema
// ---------------------------------

export const getSchemaEncoded = (definition: Definition): string => {
  return JSON.stringify(getSchema(definition));
};

export const getSchema = <$Definition extends Definition>(
  definition: $Definition,
): InferSchema<$Definition> => {
  return T.Union(definition.caseDefinitions.map(_ => _.schema)) as InferSchema<$Definition>;
};

// ---------------------------------
// Infer Schema
// ---------------------------------

export type InferSchema<$Definition extends Definition> = T.TUnion<
  _InferSchema_GetCaseDefinitionSchemas<$Definition['caseDefinitions']>
>;

type _InferSchema_GetCaseDefinitionSchemas<$CaseDefinition extends CaseDefinition[]> = {
  [i in keyof $CaseDefinition]: $CaseDefinition[i]['schema'];
};
