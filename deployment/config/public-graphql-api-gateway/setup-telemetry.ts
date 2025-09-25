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
