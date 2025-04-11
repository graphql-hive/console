import 'reflect-metadata';
import { parentPort } from 'node:worker_threads';
import { createMessagePortLogger } from '../../api/src/modules/shared/providers/logger';
import { createCompositionWorker } from './composition-worker';
import { env } from './environment';

if (!parentPort) {
  throw new Error('This script must be run as a worker.');
}

const baseLogger = createMessagePortLogger(parentPort);

createCompositionWorker({
  baseLogger,
  port: parentPort,
  env,
});
