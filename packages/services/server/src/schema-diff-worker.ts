import 'reflect-metadata';
import { parentPort } from 'node:worker_threads';
import { createSchemaDiffWorker } from '../../api/src/modules/schema/worker/schema-diff-worker';

if (!parentPort) {
  throw new Error('This script must be run as a worker.');
}

createSchemaDiffWorker(parentPort);
