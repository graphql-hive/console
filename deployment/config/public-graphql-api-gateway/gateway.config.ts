// @ts-expect-error not a dependency
import { createOtlpHttpExporter, defineConfig } from '@graphql-hive/gateway';

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
        authorization: request.headers.get('authorization'),
      };
    },
  },
  disableWebsockets: true,
  prometheus: true,
  openTelemetry: process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT']
    ? {
        serviceName: 'public-graphql-api-gateway',
        exporters: [
          createOtlpHttpExporter({
            url: process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT'],
          }),
        ],
      }
    : false,
  // TODO: this causes runtime errors
  // demandControl: {
  //   maxCost: 1000,
  //   includeExtensionMetadata: true,
  // },
  maxTokens: 1_000,
  maxDepth: 20,
});
