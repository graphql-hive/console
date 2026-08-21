import { join } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const usesLegacyGraphQL = /^graphql-(?:16)$/.test(mode);
  const graphqlVersion = mode === 'test' ? 'graphql' : mode;

  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: [
        {
          find: /^graphql$/,
          replacement: join(__dirname, `node_modules/${graphqlVersion}/index.mjs`),
        },
        ...(usesLegacyGraphQL
          ? [
              {
                find: /^graphql\/(.*)$/,
                replacement: join(__dirname, `node_modules/${graphqlVersion}/$1`),
              },
            ]
          : []),
      ],
    },
    test: {
      alias: {
        '@graphql-hive/core': new URL('./packages/libraries/core/src/index.ts', import.meta.url)
          .pathname,
      },
      globals: true,
      exclude: [
        ...defaultExclude,
        'e2e',
        'integration-tests',
        'packages/migrations/test',
        'docker/.hive-dev',
        // We only need to support graphql-16 from our SDKs
        ...(usesLegacyGraphQL ? ['packages/internal', 'packages/services', 'packages/web'] : []),
      ],
      setupFiles: ['./scripts/serializer.ts'],
      ...(usesLegacyGraphQL
        ? {
            server: {
              deps: {
                inline: true,
              },
            },
          }
        : {}),
    },
  };
});
