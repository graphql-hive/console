import {
  execute,
  parse,
  validate,
  type ExecutionResult,
  type GraphQLError,
  type GraphQLSchema,
} from 'graphql';
import type { Scenario } from '@/dev/scenarios';
import { addMocksToSchema, createMockStore, type IMockStore } from '@graphql-tools/mock';
import { buildMocks } from './mocks';
import { buildResolvers } from './resolvers';

export type GraphQLRequestBody = {
  query: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
};

export type MockEngine = {
  schema: GraphQLSchema;
  store: IMockStore;
  scenario: Scenario;
  execute(body: GraphQLRequestBody): Promise<ExecutionResult>;
};

/**
 * One engine (one store) per scenario, kept for the process lifetime, so entity ids are
 * stable across queries and reloads and graphcache never fragments.
 */
export function createMockEngine(baseSchema: GraphQLSchema, scenario: Scenario): MockEngine {
  const mocks = buildMocks(baseSchema, {
    seed: scenario.seed,
    viewerCan: scenario.viewerCan,
    fields: scenario.fields,
  });
  const store = createMockStore({
    schema: baseSchema,
    mocks,
    mockGenerationBehavior: 'deterministic',
  });
  const schema = addMocksToSchema({
    schema: baseSchema,
    store,
    resolvers: s => buildResolvers(baseSchema, s, scenario),
  });

  return {
    schema,
    store,
    scenario,
    async execute({ query, variables, operationName }) {
      let document;
      try {
        document = parse(query);
      } catch (error) {
        return { errors: [error as GraphQLError] };
      }
      // execute() silently skips unknown fields, so validate first or drift goes unnoticed.
      const validationErrors = validate(schema, document);
      if (validationErrors.length > 0) {
        return { errors: validationErrors };
      }
      return execute({
        schema,
        document,
        variableValues: variables ?? {},
        operationName: operationName ?? undefined,
        contextValue: {},
      });
    },
  };
}
