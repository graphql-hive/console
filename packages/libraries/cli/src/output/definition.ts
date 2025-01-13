import { Errors } from '../helpers/errors';
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
 * {@link Errors.Failure} when:
 *
 * 1. The result cannot be determined to be an instance of any case in the definition.
 * 2. The result shape does not fit the case definition's schema.
 */
export const parseOrThrow = (definition: Definition, resultInit: object) => {
  // todo: Make it easier for the Hive team to be alerted.
  // - Alert the Hive team automatically with some opt-in telemetry?
  // - A single-click-link with all relevant variables serialized into search parameters?
  const errorMessage = `Whoops. This Hive CLI command tried to output a value that violates its own schema. This should never happen. Please report this error to the Hive team at https://github.com/graphql-hive/console/issues/new.`;

  /**
   * 1. Find the Output Case Definition defined for this
   *    command that corresponds to the run result data.
   * 2. Then validate the result against its schema.
   */

  // 1
  // @ts-expect-error fixme
  const caseDefinitionName = resultInit.data.type;
  const caseDefinition = definition.caseDefinitions.find(
    caseDefinition =>
      caseDefinition.schema.properties.data.properties.type.const === caseDefinitionName,
  );

  if (!caseDefinition) {
    throw new Errors.Failure({
      message: errorMessage,
      data: {
        type: 'ErrorCaseDefinitionNotFound',
        message: errorMessage,
        value: resultInit,
      },
    });
  }

  const resultNotValidated = T.Value.Default(caseDefinition.schema, T.Value.Clone(resultInit));

  const errorsIterator = T.Value.Value.Errors(caseDefinition.schema, resultNotValidated);
  const errorsMaterialized = T.Value.MaterializeValueErrorIterator(errorsIterator);

  if (errorsMaterialized.length > 0) {
    // todo: In text format output, also show the data.
    // The default textual output of an OClif error will not display any of the data below. We will want that information in a bug report.
    throw new Errors.Failure({
      message: errorMessage,
      data: {
        type: 'ErrorOutputSchemaViolation',
        message: errorMessage,
        schema: caseDefinition,
        value: resultNotValidated,
        errors: errorsMaterialized,
      },
    });
  }

  // todo why parse here if we applied defaults and checked for errors above?
  // Should never throw because we checked for errors above.
  const result = T.Value.Parse(caseDefinition.schema, resultNotValidated) as Result;

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
