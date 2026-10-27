import { createRequire } from 'node:module';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../../vitest.config';

const require = createRequire(import.meta.url);

export default mergeConfig(baseConfig, {
  test: {
    alias: {
      'graphql-yoga': require.resolve('graphql-yoga-6'),
      '@graphql-yoga/plugin-defer-stream': require.resolve('@graphql-yoga-6/plugin-defer-stream'),
      '@graphql-yoga/plugin-disable-introspection': require.resolve(
        '@graphql-yoga-6/plugin-disable-introspection',
      ),
      '@graphql-yoga/plugin-graphql-sse': require.resolve('@graphql-yoga-6/plugin-graphql-sse'),
      '@graphql-yoga/plugin-response-cache': require.resolve(
        '@graphql-yoga-6/plugin-response-cache',
      ),
    },
  },
});
