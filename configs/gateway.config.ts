import { defineConfig } from '@graphql-hive/gateway';
import { hiveTracingSetup } from '@graphql-hive/plugin-opentelemetry/setup';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'; // install

hiveTracingSetup({
  contextManager: new AsyncLocalStorageContextManager(),
  target: process.env.HIVE_TRACING_TARGET!,
  accessToken: process.env.HIVE_TRACING_ACCESS_TOKEN!,
  // optional, for self-hosting
  endpoint: process.env.HIVE_TRACING_ENDPOINT!,
});

export const gatewayConfig = defineConfig({
  openTelemetry: {
    traces: true,
  },
});
