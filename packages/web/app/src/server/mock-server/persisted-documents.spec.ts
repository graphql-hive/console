import { validate } from 'graphql';
import { scenarios } from '@/dev/scenarios';
import { createMockEngine, type MockEngine } from './engine';
import { loadPersistedOperations, type PersistedOperation } from './persisted-operations';
import { plausibleVariables } from './plausible-variables';
import { loadHiveSchema } from './schema';

/**
 * Executes every operation the app can send against the default mock. Any field the mock
 * layer cannot serve, and any drift between the app's documents and the API schema, fails here.
 */
describe('persisted operations against the mock engine', () => {
  let engine: MockEngine;
  const operations = loadPersistedOperations().filter(op => op.kind !== 'subscription');

  beforeAll(async () => {
    engine = createMockEngine(await loadHiveSchema(), scenarios.default);
  });

  test('the manifest covers the app', () => {
    expect(operations.length).toBeGreaterThan(100);
    expect(operations.map(op => op.name)).toContain('TargetLayoutQuery');
  });

  test.each(operations.map(op => [op.name, op] as const))('%s', async (_name, op) => {
    expect(validate(engine.schema, op.document)).toEqual([]);

    const result = await engine.execute({
      query: op.source,
      operationName: op.name,
      variables: plausibleVariables(engine.schema, op.operation),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    walk(result.data, op);
  });
});

/** Structural invariants every response must satisfy for the UI to behave. */
function walk(value: unknown, op: PersistedOperation, path = 'data'): void {
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) walk(item, op, `${path}[${i}]`);
    return;
  }
  if (value === null || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;

  // relayPagination() would fetch forever on hasNextPage: true.
  if ('hasNextPage' in record) {
    expect(record.hasNextPage, `${op.name} ${path}.hasNextPage`).toBe(false);
  }
  // Mutation results populate ok or error, never both.
  if ('ok' in record && 'error' in record) {
    expect(record.error, `${op.name} ${path}.error`).toBeNull();
  }

  for (const [key, child] of Object.entries(record)) {
    walk(child, op, `${path}.${key}`);
  }
}
