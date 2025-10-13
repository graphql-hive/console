// @ts-expect-error not a dependency
import { defineConfig } from '@graphql-hive/gateway';
// @ts-expect-error not a dependency
import { hiveTracingSetup } from '@graphql-hive/plugin-opentelemetry/setup';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MultiSpanProcessor } from '@opentelemetry/sdk-trace-base/build/src/MultiSpanProcessor';

if (process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT'] || process.env['HIVE_TRACING_ACCESS_TOKEN']) {
  hiveTracingSetup({
    contextManager: new AsyncLocalStorageContextManager(),
    processor: new MultiSpanProcessor([
      ...(process.env['HIVE_TRACING_ACCESS_TOKEN']
        ? [
            new BatchSpanProcessor(
              new OTLPTraceExporter({
                url: process.env['HIVE_TRACING_ENDPOINT'],
                headers: {
                  Authorization: `Bearer ${process.env['HIVE_TRACING_ACCESS_TOKEN']}`,
                  'X-Hive-Target-Ref': process.env.HIVE_TRACING_TARGET!,
                },
              }),
            ),
          ]
        : []),
      ...(process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT']
        ? [
            new BatchSpanProcessor(
              new OTLPTraceExporter({
                url: process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT']!,
              }),
            ),
          ]
        : []),
    ]),
  });
}

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
  openTelemetry:
    process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT'] || process.env['HIVE_TRACING_ACCESS_TOKEN']
      ? {
          traces: true,
          serviceName: 'public-graphql-api-gateway',
        }
      : undefined,
  demandControl: {
    maxCost: 1000,
    includeExtensionMetadata: true,
  },
  maxTokens: 1_000,
  maxDepth: 20,
});
