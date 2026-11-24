import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import {
  BatchSpanProcessor,
  TracerProvider,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace';
import { configureTracing } from './tracing';

const exported: Array<ReadableSpan> = [];
const exporter: SpanExporter = {
  export(spans, resultCallback) {
    exported.push(...spans);
    resultCallback({ code: 0 });
  },
  shutdown: () => Promise.resolve(),
};
const provider = new TracerProvider({
  spanProcessors: [new BatchSpanProcessor({ exporter, scheduledDelayMillis: 60_000 })],
});

beforeAll(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  // what NodeTracerProvider#register() did before @opentelemetry/sdk-trace@3
  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  );
});

afterAll(() => {
  trace.disable();
  context.disable();
  propagation.disable();
  vi.restoreAllMocks();
});

describe('TracingInstance.shutdown', () => {
  it('exports the spans still buffered by the batch processor', async () => {
    trace.getTracer('test').startSpan('buffered').end();
    expect(exported).toHaveLength(0);

    await configureTracing({ serviceName: 'test' }).shutdown();

    expect(exported.map(span => span.name)).toEqual(['buffered']);
  });
});
