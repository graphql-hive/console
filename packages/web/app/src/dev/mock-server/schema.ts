import { fileURLToPath } from 'node:url';
import type { GraphQLSchema } from 'graphql';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { loadSchema } from '@graphql-tools/load';

// packages/web/app/src/server/mock-server -> packages/services/api/src/modules
export const HIVE_SCHEMA_GLOB = fileURLToPath(
  new URL('../../../../../services/api/src/modules/*/module.graphql.ts', import.meta.url),
);

let cached: Promise<GraphQLSchema> | undefined;

/**
 * Builds the full Hive API schema straight from the module SDL files.
 * Codegen is never invoked, so this cannot clobber hand-written resolvers.
 */
export function loadHiveSchema(): Promise<GraphQLSchema> {
  cached ??= loadSchema(HIVE_SCHEMA_GLOB, { loaders: [new CodeFileLoader()] });
  return cached;
}
