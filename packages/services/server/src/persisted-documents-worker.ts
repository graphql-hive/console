import 'reflect-metadata';
import { parentPort } from 'node:worker_threads';
import { createWorker } from '../../api/src/modules/app-deployments/worker/persisted-documents-worker';
import { createMessagePortLogger } from '../../api/src/modules/shared/providers/logger';
import { env } from './environment';

if (!parentPort) {
  throw new Error('This script must be run as a worker.');
}

createWorker(parentPort, createMessagePortLogger(parentPort), {
  clickhouse: env.clickhouse,
  s3: env.s3,
  s3Mirror: env.s3Mirror,
});
