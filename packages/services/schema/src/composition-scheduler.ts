import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import fastq from 'fastq';
import * as Sentry from '@sentry/node';
import { registerWorkerLogging, type Logger } from '../../api/src/modules/shared/providers/logger';
import type { CompositionEvent, CompositionResultEvent } from './composition-worker';

type WorkerRunArgs = {
  data: CompositionEvent['data'];
  requestId: string;
  abortSignal: AbortSignal;
};

type Task = Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'>;

type WorkerInterface = {
  readonly isIdle: boolean;
  name: string;
  /** Run a task on the worker. */
  run: (args: WorkerRunArgs) => Promise<CompositionResultEvent['data']>;
};

export class CompositionScheduler {
  private logger: Logger;
  /** The amount of parallel workers */
  private workerCount: number;
  private maxOldGenerationSizeMb: number;
  /** List of all workers */
  private workers: Array<WorkerInterface>;

  private queue: fastq.queueAsPromised<WorkerRunArgs, CompositionResultEvent['data']>;

  constructor(logger: Logger, workerCount: number, maxOldGenerationSizeMb: number) {
    this.workerCount = workerCount;
    this.maxOldGenerationSizeMb = maxOldGenerationSizeMb;
    this.logger = logger.child({ source: 'CompositionScheduler' });
    const workers = Array.from({ length: this.workerCount }, (_, i) => this.createWorker(i));
    this.workers = workers;

    this.queue = fastq.promise(
      function queue(data) {
        // Let's not process aborted requests
        if (data.abortSignal.aborted) {
          throw data.abortSignal.reason;
        }
        const worker = workers.find(worker => worker.isIdle);

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

  private createWorker(index: number): WorkerInterface {
    this.logger.debug('Creating worker %s', index);
    const name = `composition-worker-${index}`;
    const worker = new Worker(path.join(__dirname, 'composition-worker-main.js'), {
      name,
      resourceLimits: {
        maxOldGenerationSizeMb: this.maxOldGenerationSizeMb,
      },
    });

    let workerState: {
      task: Task;
      args: WorkerRunArgs;
    } | null = null;

    const recreate = () => {
      void worker.terminate().finally(() => {
        this.logger.debug('Re-Creating worker %s', index);
        this.workers[index] = this.createWorker(index);

        if (workerState) {
          this.logger.debug('Cancel pending task %s', index);
          workerState.task.reject(new Error('Worker stopped.'));
        }
      });
    };

    worker.on('error', error => {
      Sentry.captureException(error, {
        extra: {
          requestId: workerState?.args.requestId ?? '',
          compositionType: workerState?.args.data.type,
          compositionArguments: workerState?.args.data.args,
        },
        tags: {
          composition: 'TIMEOUT_OR_MEMORY_ERROR',
        },
      });
      console.error(error);
      this.logger.error('Worker error %s', error);
      recreate();
    });

    worker.on('exit', code => {
      this.logger.error('Worker stopped with exit code %s', String(code));
    });

    registerWorkerLogging(this.logger, worker, name);

    worker.on(
      'message',
      (data: CompositionResultEvent | { event: 'error'; id: string; err: Error }) => {
        if (data.event === 'error') {
          workerState?.task.reject(data.err);
        }

        if (data.event === 'compositionResult') {
          workerState?.task.resolve(data);
        }
      },
    );

    const { logger: baseLogger } = this;

    function run(args: WorkerRunArgs) {
      if (workerState) {
        throw new Error('Can not run task in worker that is not idle.');
      }
      const taskId = crypto.randomUUID();
      const logger = baseLogger.child({ taskId, reqId: args.requestId });
      const d = Promise.withResolvers<CompositionResultEvent>();

      let task: Task = {
        resolve: data => {
          args.abortSignal.removeEventListener('abort', onAbort);
          workerState = null;
          d.resolve(data);
        },
        reject: err => {
          args.abortSignal.removeEventListener('abort', onAbort);
          void worker.terminate().finally(() => {
            workerState = null;
            d.reject(err);
          });
        },
      };
      workerState = {
        task,
        args,
      };

      function onAbort() {
        logger.error('Task aborted.');
        recreate();
      }

      args.abortSignal.addEventListener('abort', onAbort);

      const time = process.hrtime();

      worker.postMessage({
        event: 'composition',
        id: taskId,
        data: args.data,
        taskId,
        requestId: args.requestId,
      } satisfies CompositionEvent);

      return d.promise
        .finally(() => {
          const endTime = process.hrtime(time);
          logger.debug('Time taken: %ds:%dms', endTime[0], endTime[1] / 1000000);
        })
        .then(result => result.data);
    }

    return {
      get isIdle() {
        return workerState === null;
      },
      name,
      run,
    };
  }

  /** Process a composition task in a worker (once the next worker is free). */
  process(args: WorkerRunArgs): Promise<CompositionResultEvent['data']> {
    return this.queue.push(args);
  }
}
