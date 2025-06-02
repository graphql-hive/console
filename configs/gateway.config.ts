/**
 * Hive Gateway Config with a Hive Console Specific Span Processor.
 *
 * ```sh
 * docker run --name hive-gateway --rm -p 4000:4000 \
 *   -v $(pwd)/configs/gateway.config.ts:/gateway/gateway.config.ts \
 *   -e HIVE_ORGANIZATION_ACCESS_TOKEN="<organization_access_key>"
 *   -e HIVE_TARGET_REF="<target_ref>"
 *   -e DEBUG=1
 *   ghcr.io/graphql-hive/gateway supergraph \
 *   "http://host.docker.internal:3001/artifacts/v1/<target_id>" \
 *   --hive-cdn-key '<cdn_key>'
 * ````
 */
import { createOtlpHttpExporter, defineConfig, GatewayPlugin } from '@graphql-hive/gateway';
import type { MeshFetchRequestInit } from '@graphql-mesh/types';
import { Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

// The following plugin is used to trace the fetch calls made by Mesh.
const useOnFetchTracer = (): GatewayPlugin => {
  const upstreamCallHeaders: Array<{
    url: string;
    headers: MeshFetchRequestInit['headers'];
  }> = [];

  return {
    onFetch({ url, options }) {
      upstreamCallHeaders.push({ url, headers: options.headers });
    },
    onRequest({ request, url, endResponse, fetchAPI }) {
      if (url.pathname === '/upstream-fetch' && request.method === 'GET') {
        endResponse(fetchAPI.Response.json(upstreamCallHeaders));
        return;
      }
    },
    onExecute({ context }) {
      const span: Span | undefined = context.opentelemetry
        .activeContext()
        ._currentContext.values()
        .next().value;

      if (!span) {
        return;
      }
      return {
        onExecuteDone(ctx) {
          const errors = new Set<string>();
          if (ctx.result?.errors) {
            for (const err of ctx.result.errors) {
              if (err.extensions?.code && typeof err.extensions.code === 'string') {
                errors.add(err.extensions.code);
              }
            }
          }
          if (errors.size) {
            span.setAttribute('hive.graphql.error.codes', Array.from(errors).join(','));
          }
        },
      };
    },
  };
};

class HiveTracingSpanProcessor implements SpanProcessor {
  private activeSpans: Map<string, Map<string, Span>> = new Map();
  private rootSpanIds: Map<string, string> = new Map();
  private subgraphNames: Map<string, Set<string>> = new Map();

  onStart(span: Span): void {
    const spanContext = span.spanContext();
    const traceId = spanContext.traceId;
    const spanId = spanContext.spanId;

    // Initialize trace data structures if needed
    if (!this.activeSpans.has(traceId)) {
      this.activeSpans.set(traceId, new Map());
    }
    if (!this.subgraphNames.has(traceId)) {
      this.subgraphNames.set(traceId, new Set());
    }

    this.activeSpans.get(traceId)!.set(spanId, span);

    // If this is a root span (no parent), mark it as the root span for this trace
    if (!span.parentSpanId) {
      this.rootSpanIds.set(traceId, spanId);
    }

    // Check if this is a subgraph execution span
    if (span.name && span.name.startsWith('subgraph.execute')) {
      const subgraphName = span.attributes['gateway.upstream.subgraph.name'];
      if (subgraphName && typeof subgraphName === 'string') {
        this.subgraphNames.get(traceId)!.add(subgraphName);
      }
    }
  }

  onEnd(span: Span): void {
    const spanContext = span.spanContext();
    const traceId = spanContext.traceId;
    const spanId = spanContext.spanId;

    // Skip if we don't have this trace
    if (!this.activeSpans.has(traceId)) {
      return;
    }

    const spansForTrace = this.activeSpans.get(traceId)!;
    const rootSpanId = this.rootSpanIds.get(traceId);
    const subgraphNamesForTrace = this.subgraphNames.get(traceId);

    // Check if this is the GraphQL execute span we're interested in
    // TODO: can we have this fully type safe?
    if (span.name === 'graphql.execute') {
      const operationType = span.attributes['graphql.operation.type'];
      const operationName = span.attributes['graphql.operation.name'];
      const errorCount = span.attributes['graphql.error.count'];
      const document = span.attributes['graphql.document'];

      if (rootSpanId) {
        const rootSpan = spansForTrace.get(rootSpanId);
        if (rootSpan && !rootSpan.ended) {
          // Update the name of the root span
          if (operationType && document) {
            rootSpan.updateName(`${operationType} ${operationName}`);

            // Copy attributes to root span
            rootSpan.setAttribute('hive.graphql.operation.type', operationType);
            rootSpan.setAttribute('hive.graphql.operation.name', operationName ?? '');
            rootSpan.setAttribute('hive.graphql.operation.document', document);

            if (errorCount !== undefined)
              rootSpan.setAttribute('hive.graphql.error.count', errorCount);

            // Add the subgraph names as a comma-separated list
            if (subgraphNamesForTrace && subgraphNamesForTrace.size > 0) {
              rootSpan.setAttribute(
                'hive.subgraph.names',
                Array.from(subgraphNamesForTrace).join(','),
              );
            }
          }
        }
      }
    }

    // For any subgraph span that's ending, make sure we capture its name
    if (span.name && span.name.startsWith('subgraph.execute')) {
      const subgraphName = span.attributes['gateway.upstream.subgraph.name'];
      if (subgraphName && typeof subgraphName === 'string' && subgraphNamesForTrace) {
        subgraphNamesForTrace.add(subgraphName);

        // Update root span with current list of subgraph names
        if (rootSpanId) {
          const rootSpan = spansForTrace.get(rootSpanId);
          if (rootSpan && !rootSpan.ended) {
            rootSpan.setAttribute(
              'hive.subgraph.names',
              Array.from(subgraphNamesForTrace).join(','),
            );
          }
        }
      }
    }

    // Clean up the span reference
    spansForTrace.delete(spanId);

    // If this is the root span or if no spans remain, clean up the trace
    if (rootSpanId === spanId || spansForTrace.size === 0) {
      this.activeSpans.delete(traceId);
      this.rootSpanIds.delete(traceId);
      this.subgraphNames.delete(traceId);
      if (process.env.DEBUG === '1') {
        console.log('span attributes', span.attributes);
      }
    }
  }

  async forceFlush(): Promise<void> {
    // Clear all processor state
    this.activeSpans.clear();
    this.rootSpanIds.clear();
    this.subgraphNames.clear();
  }

  async shutdown(): Promise<void> {
    // Clean up resources when shutting down
    await this.forceFlush();
  }
}
async function createHiveTracingSpanProcessor(): Promise<HiveTracingSpanProcessor> {
  return new HiveTracingSpanProcessor();
}

export const gatewayConfig = defineConfig({
  openTelemetry: {
    exporters: [
      createHiveTracingSpanProcessor(),
      createOtlpHttpExporter(
        {
          url: 'http://host.docker.internal:4318/v1/traces',
          headers: {
            Authorization: `Bearer ${process.env.HIVE_ORGANIZATION_ACCESS_TOKEN}`,
            'X-Hive-Target-Ref': process.env.HIVE_TARGET_REF,
          },
        },
        // Batching config is set in order to make it easier to test.
        {
          scheduledDelayMillis: 1,
        },
      ),
    ],
    serviceName: 'hive-gateway',
  },
  plugins: () => [useOnFetchTracer()],
});
