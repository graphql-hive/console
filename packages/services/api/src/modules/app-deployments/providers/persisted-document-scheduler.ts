import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'url';
import { Injectable, Scope } from 'graphql-modules';
import { getErrorSource, setErrorSource } from '@hive/service-common';
import { Logger, registerWorkerLogging } from '../../shared/providers/logger';
import { BatchProcessedEvent, BatchProcessEvent } from './persisted-document-ingester';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type PendingTaskRecord = {
  resolve: (data: BatchProcessedEvent) => void;
  reject: (err: unknown) => void;
};

export type SerializedWorkerError = {
  name: string;
  message: string;
  stack: string | undefined;
  source: string | null;
};

export function serializeWorkerError(error: unknown): SerializedWorkerError {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  return {
    name: normalizedError.name,
    message: normalizedError.message,
    stack: normalizedError.stack,
    source: getErrorSource(normalizedError),
  };
}

export function deserializeWorkerError(error: SerializedWorkerError): Error {
  const deserializedError = new Error(error.message);
  deserializedError.name = error.name;
  deserializedError.stack = error.stack;
  return error.source ? setErrorSource(deserializedError, error.source) : deserializedError;
}

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class PersistedDocumentScheduler {
  private logger: Logger;
  private workers: Array<
    (input: BatchProcessEvent['data']) => Promise<BatchProcessedEvent['data']>
  >;

  constructor(logger: Logger) {
    this.logger = logger.child({ source: 'PersistedDocumentScheduler' });
    this.workers = Array.from({ length: 4 }, (_, i) => this.createWorker(i));
  }

  private createWorker(index: number) {
    this.logger.debug('Creating worker %s', index);
    const name = `persisted-documents-worker-${index}`;
    const worker = new Worker(path.join(__dirname, 'persisted-documents-worker.js'), {
      name,
    });
    const tasks = new Map<string, PendingTaskRecord>();

    worker.on('error', error => {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error('Worker error (error=%s)', errorText);
    });

    worker.on('exit', code => {
      this.logger.error('Worker stopped with exit code %s', String(code));
      if (code === 0) {
        return;
      }

      this.logger.debug('Re-Creating worker %s', index);
      this.workers[index] = this.createWorker(index);

      this.logger.debug('Cancel pending tasks %s', index);
      for (const [, task] of tasks) {
        task.reject(setErrorSource(new Error('Worker stopped.'), 'persisted-documents-worker'));
      }
    });

    registerWorkerLogging(this.logger, worker, name);

    worker.on(
      'message',
      (
        data: BatchProcessedEvent | { event: 'error'; id: string; error: SerializedWorkerError },
      ) => {
        if (data.event === 'error') {
          tasks.get(data.id)?.reject(deserializeWorkerError(data.error));
        }

        if (data.event === 'processedBatch') {
          tasks.get(data.id)?.resolve(data);
        }
      },
    );

    const { logger } = this;

    return async function batchProcess(data: BatchProcessEvent['data']) {
      const id = crypto.randomUUID();
      const d = Promise.withResolvers<BatchProcessedEvent>();
      const timeout = setTimeout(() => {
        task.reject(
          setErrorSource(
            new Error('Timeout, worker did not respond within time.'),
            'persisted-documents-worker',
          ),
        );
      }, 20_000);

      const task: PendingTaskRecord = {
        resolve: data => {
          tasks.delete(id);
          clearTimeout(timeout);
          d.resolve(data);
        },
        reject: err => {
          tasks.delete(id);
          clearTimeout(timeout);
          d.reject(err);
        },
      };

      tasks.set(id, task);
      const time = process.hrtime();

      worker.postMessage({
        event: 'PROCESS',
        id,
        data,
      });

      const result = await d.promise.finally(() => {
        const endTime = process.hrtime(time);
        logger.debug('Time taken: %ds %dms', endTime[0], endTime[1] / 1000000);
      });

      return result.data;
    };
  }

  private getRandomWorker() {
    return this.workers[Math.floor(Math.random() * this.workers.length)];
  }

  async processBatch(data: BatchProcessEvent['data']) {
    return this.getRandomWorker()(data);
  }
}
