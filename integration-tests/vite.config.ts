import { defaultExclude, defineConfig } from 'vitest/config';

const setupFiles = ['../scripts/serializer.ts', './expect.ts'];

if (!process.env.RUN_AGAINST_LOCAL_SERVICES) {
  setupFiles.unshift('dotenv/config');
} else {
  setupFiles.unshift('./local-dev.ts');
}

export default defineConfig({
  test: {
    globals: true,
    alias: {
      'testkit/gql/graphql': new URL('./testkit/gql/graphql.ts', import.meta.url).pathname,
      'testkit/graphql': new URL('./testkit/graphql.ts', import.meta.url).pathname,
      'testkit/gql': new URL('./testkit/gql/index.ts', import.meta.url).pathname,
      'testkit/flow': new URL('./testkit/flow.ts', import.meta.url).pathname,
      'testkit/utils': new URL('./testkit/utils.ts', import.meta.url).pathname,
      'testkit/seed': new URL('./testkit/seed.ts', import.meta.url).pathname,
      'testkit/auth': new URL('./testkit/auth.ts', import.meta.url).pathname,
      'testkit/usage': new URL('./testkit/usage.ts', import.meta.url).pathname,
      'testkit/registry-models': new URL('./testkit/registry-models.ts', import.meta.url).pathname,
      'testkit/mock-server': new URL('./testkit/mock-server.ts', import.meta.url).pathname,
      '@hive/service-common': new URL(
        '../packages/services/service-common/src/index.ts',
        import.meta.url,
      ).pathname,
      '@hive/server/supertokens-at-home/shared': new URL(
        '../packages/services/server/src/supertokens-at-home/shared.ts',
        import.meta.url,
      ).pathname,
      '@hive/api/modules/auth/lib/supertokens-at-home/crypto': new URL(
        '../packages/services/api/src/modules/auth/lib/supertokens-at-home/crypto.ts',
        import.meta.url,
      ).pathname,
    },
    setupFiles,
    testTimeout: 90_000,
    exclude: process.env.TEST_APOLLO_ROUTER
      ? defaultExclude
      : [...defaultExclude, 'tests/apollo-router/**'],
  },
});
