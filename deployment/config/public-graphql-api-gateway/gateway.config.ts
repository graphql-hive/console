// @ts-expect-error not a dependency
import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  transportEntries: {
    graphql: {
      location: process.env['GRAPHQL_SERVICE_ENDPOINT'],
    },
  },
  supergraph: {
    type: 'hive',
    endpoint: process.env['SUPERGRAPH_ENDPOINT'],
    key: process.env['HIVE_CDN_ACCESS_TOKEN'],
  },
});
