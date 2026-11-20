import { SeverityLevelType } from '../src/gql/graphql';
import { createSchemaCheckJsonOutput } from '../src/helpers/schema-check-output';

describe('createSchemaCheckJsonOutput', () => {
  test('exposes the schema check id and URL of a passing check', () => {
    expect(
      createSchemaCheckJsonOutput({
        valid: true,
        initial: false,
        schemaCheck: { id: 'check-1', webUrl: 'https://app.example.com/check-1' },
        changes: { edges: [] },
        warnings: { nodes: [] },
      }),
    ).toEqual({
      valid: true,
      initial: false,
      schemaCheck: { id: 'check-1', webUrl: 'https://app.example.com/check-1' },
      message: null,
      changes: [],
      warnings: [],
      errors: [],
    });
  });

  test('maps changes, warnings and errors of a failing check', () => {
    const output = createSchemaCheckJsonOutput({
      valid: false,
      schemaCheck: { id: 'check-2' },
      changes: {
        edges: [
          {
            node: {
              severityLevel: SeverityLevelType.Breaking,
              isSafeBasedOnUsage: false,
              message: "Field 'a' was removed from object type 'Query'",
              approval: null,
              affectedAppDeployments: { totalCount: 2 },
            },
          },
          {
            node: {
              severityLevel: SeverityLevelType.Breaking,
              isSafeBasedOnUsage: true,
              message: "Field 'b' was removed from object type 'Query'",
              approval: { approvedBy: { displayName: 'Jane' } },
            },
          },
        ],
      },
      warnings: { nodes: [{ message: 'Careful', source: 'schema.graphql', line: 3, column: 1 }] },
      errors: { edges: [{ node: { message: 'Composition failed' } }] },
    });

    expect(output.valid).toBe(false);
    expect(output.initial).toBeNull();
    expect(output.schemaCheck).toEqual({ id: 'check-2', webUrl: null });
    expect(output.changes).toEqual([
      {
        message: "Field 'a' was removed from object type 'Query'",
        severity: 'BREAKING',
        isSafeBasedOnUsage: false,
        approvedBy: null,
        affectedAppDeployments: 2,
      },
      {
        message: "Field 'b' was removed from object type 'Query'",
        severity: 'BREAKING',
        isSafeBasedOnUsage: true,
        approvedBy: 'Jane',
        affectedAppDeployments: 0,
      },
    ]);
    expect(output.warnings).toEqual([
      { message: 'Careful', source: 'schema.graphql', line: 3, column: 1 },
    ]);
    expect(output.errors).toEqual([{ message: 'Composition failed' }]);
  });

  test('reports the GitHub App check message', () => {
    expect(
      createSchemaCheckJsonOutput({
        valid: true,
        message: 'Schema check passed',
        schemaCheck: null,
      }),
    ).toMatchObject({ valid: true, message: 'Schema check passed', schemaCheck: null });
  });
});
