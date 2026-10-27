import { createRequire } from 'node:module';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defaultExclude, defineConfig } from 'vitest/config';

// The `graphql-yoga-6` aliases are dev dependencies of `@graphql-hive/yoga`, so resolve them from there.
const yogaRequire = createRequire(
  new URL('./packages/libraries/yoga/package.json', import.meta.url),
);

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    alias: {
      '@graphql-hive/core': new URL('./packages/libraries/core/src/index.ts', import.meta.url)
        .pathname,
      // Both packages publish from `dist`, which tests do not build; resolve them from source so a
      // spec that pulls one in (directly or through the app's route tree) needs no build step.
      '@graphql-hive/laboratory': new URL(
        './packages/libraries/laboratory/src/index.tsx',
        import.meta.url,
      ).pathname,
    },
    globals: true,
    exclude: [
      ...defaultExclude,
      'e2e',
      'integration-tests',
      'packages/migrations/test',
      'docker/.hive-dev',
    ],
    setupFiles: [new URL('./scripts/serializer.ts', import.meta.url).pathname],
    projects: [
      {
        extends: true,
        test: { name: 'default' },
      },
      {
        // Runs the `@graphql-hive/yoga` tests a second time against graphql-yoga@6 (the default project covers v5).
        extends: true,
        test: {
          name: 'yoga-6',
          include: ['packages/libraries/yoga/tests/**/*.spec.ts'],
          alias: {
            'graphql-yoga': yogaRequire.resolve('graphql-yoga-6'),
            '@graphql-yoga/plugin-defer-stream': yogaRequire.resolve(
              '@graphql-yoga-6/plugin-defer-stream',
            ),
            '@graphql-yoga/plugin-disable-introspection': yogaRequire.resolve(
              '@graphql-yoga-6/plugin-disable-introspection',
            ),
            '@graphql-yoga/plugin-graphql-sse': yogaRequire.resolve(
              '@graphql-yoga-6/plugin-graphql-sse',
            ),
            '@graphql-yoga/plugin-persisted-operations': yogaRequire.resolve(
              '@graphql-yoga-6/plugin-persisted-operations',
            ),
            '@graphql-yoga/plugin-response-cache': yogaRequire.resolve(
              '@graphql-yoga-6/plugin-response-cache',
            ),
          },
        },
      },
    ],
  },
});
