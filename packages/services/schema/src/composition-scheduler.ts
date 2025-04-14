import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import fastq from 'fastq';
import * as Sentry from '@sentry/node';
import { registerWorkerLogging, type Logger } from '../../api/src/modules/shared/providers/logger';
import type { CompositionEvent, CompositionResultEvent } from './composition-worker';

type QueueData = {
  data: CompositionEvent['data'];
  requestId: string;
  abortSignal: AbortSignal;
};

type Task = Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'>;

type WWorker = {
  task: null | {
    task: Task;
    data: QueueData;
  };
  run: (input: QueueData) => Promise<CompositionResultEvent['data']>;
};

export class CompositionScheduler {
  private logger: Logger;
  /** The amount of parallel workers */
  private workerCount: number;
  private maxOldGenerationSizeMb: number;
  /** List of all workers */
  private workers: Array<WWorker>;

  private queue: fastq.queueAsPromised<QueueData, CompositionResultEvent['data']>;

  constructor(logger: Logger, workerCount: number, maxOldGenerationSizeMb: number) {
    this.workerCount = workerCount;
    this.maxOldGenerationSizeMb = maxOldGenerationSizeMb;
    this.logger = logger.child({ source: 'CompositionScheduler' });
    const workers = Array.from({ length: this.workerCount }, (_, i) => this.createWorker(i));
    this.workers = workers;

    this.queue = fastq.promise(
      function queue(data) {
        const worker = workers.find(worker => worker.task === null);
        // Let's not process aborted requests
        if (data.abortSignal.aborted) {
          throw data.abortSignal.reason;
        }

        if (!worker) {
          throw new Error('No idle worker found.');
        }
        return worker.run(data);
      },
      // The size needs to be the same as the length of `this.workers`.
      // Otherwise a worker would process more than a single task at a time.
      this.workerCount,
    );
  }

  private createWorker(index: number) {
    this.logger.debug('Creating worker %s', index);
    const name = `composition-worker-${index}`;
    const worker = new Worker(path.join(__dirname, 'composition-worker-main.js'), {
      name,
      resourceLimits: {
        maxOldGenerationSizeMb: this.maxOldGenerationSizeMb,
      },
    });
    let currentTask: WWorker['task'] | null = null;

    const recreate = () => {
      void worker.terminate().finally(() => {
        this.logger.debug('Re-Creating worker %s', index);
        this.workers[index] = this.createWorker(index);

        if (currentTask) {
          this.logger.debug('Cancel pending task %s', index);
          currentTask.task.reject(new Error('Worker stopped.'));
        }
      });
    };

    worker.on('error', error => {
      Sentry.captureException(error, {
        extra: {
          requestId: currentTask?.data.requestId ?? '',
          compositionType: currentTask?.data.data.type,
          compositionArguments: currentTask?.data.data.args,
        },
        tags: {
          composition: 'TIMEOUT_OR_MEMORY_ERROR',
        },
      });
      console.error(error);
      this.logger.error('Worker error %s', error);
      recreate();
    });

    let didAbortTask = false;
    worker.on('exit', code => {
      this.logger.error('Worker stopped with exit code %s', String(code));
      if (didAbortTask) {
        recreate();
      }
    });

    registerWorkerLogging(this.logger, worker, name);

    worker.on(
      'message',
      (data: CompositionResultEvent | { event: 'error'; id: string; err: Error }) => {
        if (data.event === 'error') {
          currentTask?.task.reject(data.err);
        }

        if (data.event === 'compositionResult') {
          currentTask?.task.resolve(data);
        }
      },
    );

    const { logger: baseLogger } = this;

    return {
      task: null,
      run(queueData: QueueData) {
        if (this.task) {
          throw new Error('Can not run task in worker that is not idle.');
        }
        const taskId = crypto.randomUUID();
        const logger = baseLogger.child({ taskId, reqId: queueData.requestId });
        const d = Promise.withResolvers<CompositionResultEvent>();

        let task: Task = {
          resolve: data => {
            queueData.abortSignal.removeEventListener('abort', onAbort);
            currentTask = null;
            d.resolve(data);
          },
          reject: err => {
            queueData.abortSignal.removeEventListener('abort', onAbort);
            currentTask = null;
            void worker.terminate().finally(() => {
              d.reject(err);
            });
          },
        };
        currentTask = {
          task,
          data: queueData,
        };

        function onAbort() {
          didAbortTask = true;
          logger.error('Task aborted.');
          task.reject(new Error('Task was aborted'));
        }

        queueData.abortSignal.addEventListener('abort', onAbort);

        const time = process.hrtime();

        worker.postMessage({
          event: 'composition',
          id: taskId,
          data: queueData.data,
          taskId,
          requestId: queueData.requestId,
        } satisfies CompositionEvent);

        return d.promise
          .finally(() => {
            this.task = null;
            const endTime = process.hrtime(time);
            logger.debug('Time taken: %ds:%dms', endTime[0], endTime[1] / 1000000);
          })
          .then(result => result.data);
      },
    } satisfies WWorker;
  }

  /** Process a composition task in a worker (once the next worker is free). */
  process(data: QueueData): Promise<CompositionResultEvent['data']> {
    return this.queue.push(data);
  }
}
