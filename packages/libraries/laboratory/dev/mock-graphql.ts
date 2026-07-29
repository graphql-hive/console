/**
 * Mock GraphQL endpoint for developing the laboratory UI.
 *
 * Mounted onto the Vite dev server at /graphql by vite.config.ts, so `pnpm dev`
 * gives the lab a same-origin endpoint with no extra process and no CORS.
 *
 * Serves Hive's own API schema (the repo root schema.graphql) with generated
 * resolvers, so the builder has a large, deeply nested, described schema to
 * render. Values are deterministic so response sizes stay stable between runs.
 *
 * Send `x-query-plan: <fixture>` with a request to get an extensions.queryPlan back;
 * see dev/query-plan-fixtures.ts for the names. Omit the header for the empty state.
 *
 * Note: everything here goes through graphql-yoga's own exports on purpose. The
 * workspace has two copies of `graphql` (16.9.0 hoisted at the root, 16.14.2 for
 * this package) and importing it directly builds a schema that fails yoga's
 * internal instanceof checks with "Duplicate graphql modules cannot be used".
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { resolveQueryPlanFixture } from './query-plan-fixtures';

/** Structural shapes, so this file never needs graphql's own type predicates. */
type MockType = {
  ofType?: MockType;
  name?: string;
  getValues?: () => Array<{ value: unknown }>;
  serialize?: unknown;
  toString: () => string;
};

type MockField = { type: MockType; resolve?: (source: unknown) => unknown };

type MockNamedType = {
  name: string;
  getFields?: () => Record<string, MockField>;
  isTypeOf?: unknown;
  resolveType?: unknown;
};

const SCALAR_VALUES: Record<string, unknown> = {
  ID: 'mock-id',
  Int: 42,
  Float: 3.14,
  Boolean: true,
  SafeInt: 42,
  Date: '2026-07-25',
  DateTime: '2026-07-25T09:00:00.000Z',
  DateTime64: '2026-07-25T09:00:00.000Z',
  JSON: { mock: true },
  JSONObject: { mock: true },
  JSONSchemaObject: { type: 'object' },
};

const mockValue = (type: MockType, fieldName: string): unknown => {
  const signature = type.toString();

  if (signature.endsWith('!') && type.ofType) {
    return mockValue(type.ofType, fieldName);
  }

  if (signature.startsWith('[') && type.ofType) {
    return [0, 1, 2].map(() => mockValue(type.ofType as MockType, fieldName));
  }

  // Enums expose getValues; check before scalars, since enums serialize too.
  if (typeof type.getValues === 'function') {
    return type.getValues()[0]?.value ?? null;
  }

  if (typeof type.serialize === 'function') {
    if (type.name === 'String') {
      return `${fieldName} value`;
    }

    return type.name && type.name in SCALAR_VALUES
      ? SCALAR_VALUES[type.name]
      : `${fieldName} value`;
  }

  // Object, interface and union types resolve to an empty shell; their own
  // field resolvers fill in the next level down.
  return {};
};

const queryPlanPlugin: Plugin = {
  onExecute({ args }) {
    const request = (args.contextValue as { request?: Request } | undefined)?.request;
    const queryPlan = resolveQueryPlanFixture(request?.headers.get('x-query-plan') ?? null);

    if (!queryPlan) {
      return;
    }

    return {
      onExecuteDone({ result, setResult }) {
        // Streamed results (defer/stream) arrive as async iterables; skip those.
        if (Symbol.asyncIterator in Object(result)) {
          return;
        }

        const single = result as { errors?: unknown[]; extensions?: Record<string, unknown> };

        if (single.errors?.length) {
          return;
        }

        setResult({ ...single, extensions: { ...single.extensions, queryPlan } });
      },
    };
  },
};

export const createMockYoga = ({ graphqlEndpoint = '/graphql' } = {}) => {
  const schemaPath = fileURLToPath(new URL('../../../../schema.graphql', import.meta.url));
  const schema = createSchema({ typeDefs: readFileSync(schemaPath, 'utf-8') });

  for (const type of Object.values(schema.getTypeMap()) as unknown as MockNamedType[]) {
    if (type.name.startsWith('__')) {
      continue;
    }

    // Object types own isTypeOf; interfaces and unions own resolveType.
    if ('isTypeOf' in type && typeof type.getFields === 'function') {
      for (const [fieldName, field] of Object.entries(type.getFields())) {
        field.resolve = (source: unknown) => {
          // Honour anything an ancestor explicitly provided.
          if (source && typeof source === 'object' && fieldName in source) {
            return (source as Record<string, unknown>)[fieldName];
          }

          return mockValue(field.type, fieldName);
        };
      }
    }

    if ('resolveType' in type) {
      const possibleTypes = schema.getPossibleTypes(type as never);
      type.resolveType = () => possibleTypes[0]?.name ?? null;
    }
  }

  return createYoga({
    schema,
    graphqlEndpoint,
    graphiql: false,
    plugins: [queryPlanPlugin],
  });
};
