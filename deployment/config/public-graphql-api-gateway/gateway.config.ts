// @ts-expect-error not a dependency
import { defineConfig } from '@graphql-hive/gateway';

const defaultQuery = `#
# Welcome to the Hive Console GraphQL API.
#
`;

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
  graphiql: {
    title: 'Hive Console - GraphQL API',
    defaultQuery,
  },
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      return {
        'x-request-id': request.headers.get('x-request-id'),
      };
    },
  },
  disableWebsockets: true,
});
