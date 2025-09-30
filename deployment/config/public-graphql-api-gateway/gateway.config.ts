// @ts-expect-error not a dependency
import { defineConfig } from '@graphql-hive/gateway';
// @ts-expect-error not a dependency
import { openTelemetrySetup } from '@graphql-hive/gateway/opentelemetry/setup';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

openTelemetrySetup({
  // Mandatory: It depends on the available API in your runtime.
  // We recommend AsyncLocalStorage based manager when possible.
  // `@opentelemetry/context-zone` is also available for other runtimes.
  // Pass `false` to disable context manager usage.
  contextManager: new AsyncLocalStorageContextManager(),

  traces: {
    // Define your exporter, most of the time the OTLP HTTP one. Traces are batched by default.
    exporter: new OTLPTraceExporter({ url: process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT']! }),
    // You can easily enable a console exporter for quick debug
    console: process.env['DEBUG_TRACES'] === '1',
  },
});

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
      }
    : false,
  demandControl: {
    maxCost: 1000,
    includeExtensionMetadata: true,
  },
  maxTokens: 1_000,
  maxDepth: 20,
});
