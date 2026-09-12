import {
  getNullableType,
  isEnumType,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  isScalarType,
  typeFromAST,
  type GraphQLInputType,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql';

const SCALAR_VALUES: Record<string, unknown> = {
  String: 'x',
  ID: 'x',
  Int: 1,
  Float: 1,
  SafeInt: 1,
  Boolean: true,
  DateTime: '2026-01-01T00:00:00.000Z',
  DateTime64: '2026-01-01T00:00:00.000000Z',
  Date: '2026-01-01',
  JSON: {},
  JSONObject: {},
  JSONSchemaObject: { type: 'object' },
};

/**
 * Builds a variables object that passes validation for an operation: every non-null
 * variable gets a value, nested input objects get their required fields, oneOf inputs
 * get exactly their first member.
 */
export function plausibleVariables(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const definition of operation.variableDefinitions ?? []) {
    const type = typeFromAST(schema, definition.type);
    if (type && isInputType(type) && isNonNullType(type)) {
      out[definition.variable.name.value] = valueFor(type);
    }
  }
  return out;
}

function valueFor(type: GraphQLInputType): unknown {
  const nullable = getNullableType(type);
  if (isListType(nullable)) return [valueFor(nullable.ofType)];
  if (isEnumType(nullable)) return nullable.getValues()[0].value;
  if (isScalarType(nullable)) return SCALAR_VALUES[nullable.name] ?? 'x';
  if (isInputObjectType(nullable)) {
    const fields = Object.values(nullable.getFields());
    if (nullable.isOneOf) {
      return { [fields[0].name]: valueFor(fields[0].type) };
    }
    return Object.fromEntries(
      fields.filter(f => isNonNullType(f.type)).map(f => [f.name, valueFor(f.type)]),
    );
  }
  return null;
}
