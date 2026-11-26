import 'reflect-metadata';
import { parentPort } from 'node:worker_threads';
import { configureTracing } from '@hive/service-common';
import { createSchemaWorker } from '../../api/src/modules/schema/worker/schema-worker';
import { env } from './environment';

if (!parentPort) {
  throw new Error('This script must be run as a worker.');
}

if (env.tracing.collectorEndpoint) {
  configureTracing({
    collectorEndpoint: env.tracing.collectorEndpoint,
    serviceName: 'graphql-api',
    enableConsoleExporter: env.tracing.enableConsoleExporter,
  }).setup();
}

createSchemaWorker(parentPort);
