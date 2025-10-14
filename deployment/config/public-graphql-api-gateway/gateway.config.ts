// @ts-expect-error not a dependency
import { defineConfig } from '@graphql-hive/gateway';
// @ts-expect-error not a dependency
import { hiveTracingSetup } from '@graphql-hive/plugin-opentelemetry/setup';
import type { Context } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { globalErrorHandler } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchSpanProcessor,
  SpanProcessor,
  type ReadableSpan,
  type Span,
} from '@opentelemetry/sdk-trace-base';

/** Note: this is inlined for now... */
class MultiSpanProcessor implements SpanProcessor {
  constructor(private readonly _spanProcessors: SpanProcessor[]) {}

  forceFlush(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const spanProcessor of this._spanProcessors) {
      promises.push(spanProcessor.forceFlush());
    }
    return new Promise(resolve => {
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch(error => {
          globalErrorHandler(error || new Error('MultiSpanProcessor: forceFlush failed'));
          resolve();
        });
    });
  }

  onStart(span: Span, context: Context): void {
    for (const spanProcessor of this._spanProcessors) {
      spanProcessor.onStart(span, context);
    }
  }

  onEnd(span: ReadableSpan): void {
    for (const spanProcessor of this._spanProcessors) {
      spanProcessor.onEnd(span);
    }
  }

  shutdown(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const spanProcessor of this._spanProcessors) {
      promises.push(spanProcessor.shutdown());
    }
    return new Promise((resolve, reject) => {
      Promise.all(promises).then(() => {
        resolve();
      }, reject);
    });
  }
}

if (process.env['OPENTELEMETRY_COLLECTOR_ENDPOINT'] || process.env['HIVE_TRACING_ACCESS_TOKEN']) {
  hiveTracingSetup({
    // Noop is only there to not raise an exception in case we do not hive console tracing.
    target: process.env['HIVE_TARGET'] ?? 'noop',
    contextManager: new AsyncLocalStorageContextManager(),
    processor: new MultiSpanProcessor([
      ...(process.env['HIVE_TRACING_ACCESS_TOKEN'] &&
      process.env['HIVE_TRACING_ENDPOINT'] &&
      process.env['HIVE_TARGET']
        ? [
            new BatchSpanProcessor(
              new OTLPTraceExporter({
                url: process.env['HIVE_TRACING_ENDPOINT'],
                headers: {
                  Authorization: `Bearer ${process.env['HIVE_TRACING_ACCESS_TOKEN']}`,
                  'X-Hive-Target-Ref': process.env['HIVE_TARGET'],
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
