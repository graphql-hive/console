import {
  computeSchemaChanges,
  deserializeSchemaChange,
  type SchemaDiffInput,
} from '../lib/schema-diff';
import { runSchemaDiff } from './schema-diff-worker';

const existingSdl = /* GraphQL */ `
  type Query {
    user(id: ID): User
    users: [User!]!
  }
  type User {
    id: ID!
    name: String
    "The email"
    email: String
  }
`;
const incomingSdl = /* GraphQL */ `
  type Query {
    user(id: ID!): User
  }
  type User {
    id: ID!
    name: String!
    "  The email  "
    email: String
    age: Int
  }
`;

test('returns the same changes as computing the diff on the main thread', async () => {
  const input: SchemaDiffInput = {
    existingSdl,
    incomingSdl,
    source: 'composed',
    filterNestedChanges: true,
    filterOutFederationChanges: false,
  };

  const result = await runSchemaDiff(input);
  if (result.status !== 'completed') {
    throw new Error('Expected a completed diff.');
  }

  const local = await computeSchemaChanges(input);
  if (local.status !== 'completed') {
    throw new Error('Expected a completed diff.');
  }

  // The changes are structured cloned when posted from the worker thread to the main thread.
  const fromWorker = structuredClone(result.changes).map(deserializeSchemaChange);

  const comparable = (change: (typeof fromWorker)[number]) => ({
    id: change.id,
    type: change.type,
    criticality: change.criticality,
    message: change.message,
    path: change.path,
    reason: change.reason,
    meta: change.meta,
    isSafeBasedOnUsage: change.isSafeBasedOnUsage,
    breakingChangeSchemaCoordinate: change.breakingChangeSchemaCoordinate,
  });

  expect(fromWorker.map(comparable)).toEqual(local.changes.map(comparable));
  expect(fromWorker.map(change => change.type)).toEqual(
    expect.arrayContaining([
      'FIELD_REMOVED',
      'FIELD_ADDED',
      'FIELD_ARGUMENT_TYPE_CHANGED',
      'FIELD_TYPE_CHANGED',
    ]),
  );
  // Description changes that only differ in whitespace are dropped.
  expect(fromWorker.map(change => change.type)).not.toContain('FIELD_DESCRIPTION_CHANGED');
});

test('is skipped when a schema can not be built', async () => {
  await expect(
    runSchemaDiff({
      existingSdl,
      incomingSdl: 'iliketurtles',
      source: 'composed',
      filterNestedChanges: true,
      filterOutFederationChanges: false,
    }),
  ).resolves.toEqual({ status: 'skipped' });
});

test('service SDL can extend types it does not define', async () => {
  await expect(
    runSchemaDiff({
      existingSdl: /* GraphQL */ `
        extend type Query {
          a: String
        }
      `,
      incomingSdl: /* GraphQL */ `
        extend type Query {
          a: String
          b: String
        }
      `,
      source: 'service',
      filterNestedChanges: false,
      filterOutFederationChanges: false,
    }),
  ).resolves.toMatchObject({
    status: 'completed',
    changes: [{ type: 'FIELD_ADDED', meta: { typeName: 'Query', addedFieldName: 'b' } }],
  });
});

test('filters out Federation specific changes', async () => {
  const input = (filterOutFederationChanges: boolean): SchemaDiffInput => ({
    existingSdl: /* GraphQL */ `
      type Query {
        a: String
      }
    `,
    incomingSdl: /* GraphQL */ `
      scalar join__FieldSet
      type Query {
        a: String
      }
    `,
    source: 'composed',
    filterNestedChanges: true,
    filterOutFederationChanges,
  });

  await expect(runSchemaDiff(input(true))).resolves.toEqual({
    status: 'completed',
    changes: [],
  });
  await expect(runSchemaDiff(input(false))).resolves.toMatchObject({
    status: 'completed',
    changes: [{ type: 'TYPE_ADDED' }],
  });
});
