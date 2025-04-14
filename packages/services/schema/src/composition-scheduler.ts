import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import fastq from 'fastq';
import { registerWorkerLogging, type Logger } from '../../api/src/modules/shared/providers/logger';
import type { CompositionEvent, CompositionResultEvent } from './composition-worker';

type QueueData = {
  data: CompositionEvent['data'];
  requestId: string;
  abortSignal: AbortSignal;
};

type WWorker = {
  state: 'idle' | 'processing';
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
        const worker = workers.find(worker => worker.state === 'idle');
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
    const tasks = new Map<string, Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'>>();

    const recreate = () => {
      void worker.terminate().finally(() => {
        this.logger.debug('Re-Creating worker %s', index);
        this.workers[index] = this.createWorker(index);

        for (const [, task] of tasks) {
          this.logger.debug('Cancel pending tasks %s', index);
          task.reject(new Error('Worker stopped.'));
        }
      });
    };

    worker.on('error', error => {
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
          tasks.get(data.id)?.reject(data.err);
        }

        if (data.event === 'compositionResult') {
          tasks.get(data.id)?.resolve(data);
        }
      },
    );

    const { logger: baseLogger } = this;

    return {
      state: 'idle' as const,
      run({ data, requestId, abortSignal }: QueueData) {
        if (this.state !== 'idle') {
          throw new Error('Can not run task in worker that is not idle.');
        }
        this.state = 'processing';
        const taskId = crypto.randomUUID();
        const logger = baseLogger.child({ taskId, reqId: requestId });
        const d = Promise.withResolvers<CompositionResultEvent>();

        const task: Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'> = {
          resolve: data => {
            abortSignal.removeEventListener('abort', onAbort);
            tasks.delete(taskId);
            d.resolve(data);
          },
          reject: err => {
            abortSignal.removeEventListener('abort', onAbort);
            tasks.delete(taskId);
            void worker.terminate().finally(() => {
              d.reject(err);
            });
          },
        };

        function onAbort() {
          didAbortTask = true;
          logger.error('Task aborted.');
          task.reject(new Error('Task was aborted'));
        }

        abortSignal.addEventListener('abort', onAbort);

        tasks.set(taskId, task);
        const time = process.hrtime();

        worker.postMessage({
          event: 'composition',
          id: taskId,
          data,
          taskId,
          requestId,
        } satisfies CompositionEvent);

        return d.promise
          .finally(() => {
            this.state = 'idle';
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
