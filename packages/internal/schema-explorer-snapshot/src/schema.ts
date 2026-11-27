import { buildASTSchema as buildGraphQLSchema, parse, type DocumentNode } from 'graphql';
import { traceInlineSync } from '@hive/service-common';

/** `graphql.parse` without locations, recorded as an OpenTelemetry span. */
export const parseGraphQLSource = traceInlineSync(
  (_source, context) => `parseGraphQLSource: ${context}`,
  {},
  (source: string, _context: string) => parse(source, { noLocation: true }),
);

/** Builds a GraphQLSchema without validating the SDL, recorded as an OpenTelemetry span. */
export const buildASTSchema = traceInlineSync('buildASTSchema', {}, (schema: DocumentNode) =>
  buildGraphQLSchema(schema, { assumeValid: true, assumeValidSDL: true }),
);
