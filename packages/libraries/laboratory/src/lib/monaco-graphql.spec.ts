import type { IntrospectionQuery } from 'graphql';
import { resetMonacoGraphQLForTests, syncMonacoGraphQL } from './monaco-graphql';

const setSchemaConfig = vi.fn();
const setDiagnosticSettings = vi.fn();
const setCompletionSettings = vi.fn();
const initializeMode = vi.fn(() => ({
  setSchemaConfig,
  setDiagnosticSettings,
  setCompletionSettings,
}));

vi.mock('monaco-graphql/initializeMode', () => ({
  initializeMode: (...args: unknown[]) => initializeMode(...(args as [])),
}));

const introspection = { __schema: {} } as unknown as IntrospectionQuery;

const OPERATION_URI = 'file:///operation_http%3A%2F%2Flocalhost.graphql';
const VARIABLES_URI = 'file:///variables.json';

describe('syncMonacoGraphQL', () => {
  beforeEach(() => {
    resetMonacoGraphQLForTests();
    vi.clearAllMocks();
  });

  it('initializes the mode once and updates it afterwards', () => {
    syncMonacoGraphQL({ introspection, schemaUri: 'schema_a.graphql' });
    syncMonacoGraphQL({ introspection, schemaUri: 'schema_b.graphql' });

    expect(initializeMode).toHaveBeenCalledTimes(1);
    expect(setSchemaConfig).toHaveBeenCalledTimes(1);
    expect(setSchemaConfig).toHaveBeenLastCalledWith([
      { introspectionJSON: introspection, uri: 'schema_b.graphql' },
    ]);
  });

  // The bug this replaces: whichever editor mounted first froze the config, and
  // only the operation editor knows about a variables model.
  it('registers variables validation even when another editor initialized the mode', () => {
    syncMonacoGraphQL({ introspection, schemaUri: 'schema.graphql' });

    expect(initializeMode.mock.calls[0][0]).toMatchObject({
      diagnosticSettings: { validateVariablesJSON: {} },
    });

    syncMonacoGraphQL({
      introspection,
      schemaUri: 'schema.graphql',
      operationUri: OPERATION_URI,
      variablesUri: VARIABLES_URI,
    });

    expect(setDiagnosticSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validateVariablesJSON: { [OPERATION_URI]: [VARIABLES_URI] },
      }),
    );
  });

  it('keeps validating after the endpoint re-keys the operation uri', () => {
    const nextOperationUri = 'file:///operation_http%3A%2F%2Fexample.graphql';

    syncMonacoGraphQL({
      introspection,
      schemaUri: 'schema.graphql',
      operationUri: OPERATION_URI,
      variablesUri: VARIABLES_URI,
    });
    syncMonacoGraphQL({
      introspection,
      schemaUri: 'schema.graphql',
      operationUri: nextOperationUri,
      variablesUri: VARIABLES_URI,
    });

    expect(setDiagnosticSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validateVariablesJSON: {
          [OPERATION_URI]: [VARIABLES_URI],
          [nextOperationUri]: [VARIABLES_URI],
        },
      }),
    );
  });
});
