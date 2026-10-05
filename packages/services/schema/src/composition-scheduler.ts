import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import fastq from 'fastq';
import { trace, type Span } from '@hive/service-common';
import * as Sentry from '@sentry/node';
import { registerWorkerLogging, type Logger } from '../../api/src/modules/shared/providers/logger';
import type {
  CompositionEvent,
  CompositionResultEvent,
  ErrorResultEvent,
} from './composition-worker';
import {
  compositionQueueDurationMS,
  compositionTotalDurationMS,
  compositionWorkerDurationMS,
} from './metrics';

type WorkerRunArgs = {
  data: CompositionEvent['data'];
  requestId: string;
  abortSignal: AbortSignal;
  /** Span of the request that queued the task; the queue callback may run in another request's context. */
  span?: Span;
};

type Task = Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'>;

type WorkerInterface = {
  readonly isIdle: boolean;
  name: string;
  /** Run a task on the worker. */
  run: (args: WorkerRunArgs) => Promise<CompositionResultEvent['data']>;
  /** Terminate the worker thread. */
  terminate: () => Promise<number>;
};

type QueueData = {
  args: WorkerRunArgs;
  addedToQueueTime: number;
};

export class CompositionScheduler {
  private logger: Logger;
  /** The amount of parallel workers */
  private workerCount: number;
  private maxOldGenerationSizeMb: number;
  private workerScriptPath: string;
  /** List of all workers */
  private workers: Array<WorkerInterface>;

  private queue: fastq.queueAsPromised<QueueData, CompositionResultEvent['data']>;

  constructor(
    logger: Logger,
    workerCount: number,
    maxOldGenerationSizeMb: number,
    workerScriptPath = path.join(__dirname, 'composition-worker-main.js'),
  ) {
    this.workerCount = workerCount;
    this.maxOldGenerationSizeMb = maxOldGenerationSizeMb;
    this.workerScriptPath = workerScriptPath;
    this.logger = logger.child({ source: 'CompositionScheduler' });
    const workers = Array.from({ length: this.workerCount }, (_, i) => this.createWorker(i));
    this.workers = workers;

    this.queue = fastq.promise(
      async function queue(data) {
        // Let's not process aborted requests
        if (data.args.abortSignal.aborted) {
          throw data.args.abortSignal.reason;
        }
        const startProcessingTime = now();
        compositionQueueDurationMS.observe(startProcessingTime - data.addedToQueueTime);
        const worker = workers.find(worker => worker.isIdle);
        if (!worker) {
          throw new Error('No idle worker found.');
        }

        const result = await worker.run(data.args);
        const finishedTime = now();
        compositionWorkerDurationMS.observe(
          { type: data.args.data.type },
          finishedTime - startProcessingTime,
        );
        compositionTotalDurationMS.observe(finishedTime - data.addedToQueueTime);
        return result;
      },
      // The size needs to be the same as the length of `this.workers`.
      // Otherwise a worker would process more than a single task at a time.
      this.workerCount,
    );
  }

  private createWorker(index: number): WorkerInterface {
    this.logger.debug('Creating worker %s', index);
    const name = `composition-worker-${index}`;
    const worker = new Worker(this.workerScriptPath, {
      name,
      resourceLimits: {
        maxOldGenerationSizeMb: this.maxOldGenerationSizeMb,
      },
    });

    let workerState: {
      task: Task;
      args: WorkerRunArgs;
    } | null = null;
    let exited = false;
    let replaced = false;

    // Replace the slot first so the queue never sees a dead but idle worker.
    const recreate = (reason: Error) => {
      if (replaced) {
        return;
      }
      replaced = true;
      this.logger.debug('Re-Creating worker %s (reason=%s)', index, reason.message);
      this.workers[index] = this.createWorker(index);
      const pending = workerState;
      workerState = null;
      void worker.terminate().catch(() => {});
      if (pending) {
        this.logger.debug('Cancel pending task %s', index);
        pending.task.reject(reason);
      }
    };

    // catch uncaught exception from worker thread. Worker thread gets terminated.
    worker.on('error', err => {
      const error =
        err instanceof Error
          ? err
          : typeof err === 'string'
            ? new Error(err)
            : new Error(JSON.stringify(err));
      this.logger.error('Worker error (error=%s)', error.message);
      Sentry.captureException(error, {
        extra: {
          requestId: workerState?.args.requestId ?? '',
          compositionType: workerState?.args.data.type,
        },
      });
      recreate(error);
    });

    worker.on('exit', code => {
      exited = true;
      if (replaced) {
        this.logger.debug('Worker stopped with exit code %s', String(code));
        return;
      }
      this.logger.error('Worker stopped with exit code %s', String(code));
      recreate(new Error(`Worker exited unexpectedly (code=${String(code)})`));
    });

    registerWorkerLogging(this.logger, worker, name);

    worker.on('message', (data: CompositionResultEvent | ErrorResultEvent) => {
      if (data.event === 'error') {
        workerState?.task.reject(data.err);
      }

      if (data.event === 'compositionResult') {
        workerState?.task.resolve(data);
      }
    });

    const { logger: baseLogger, maxOldGenerationSizeMb } = this;

    function run(args: WorkerRunArgs) {
      if (exited || replaced) {
        // postMessage on an exited worker is silently dropped; fail fast instead of hanging.
        throw new Error(`Worker ${name} has exited; refusing to run task.`);
      }
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
          // A handled composition error leaves the worker usable; keep it.
          args.abortSignal.removeEventListener('abort', onAbort);
          workerState = null;
          d.reject(err);
        },
      };
      workerState = {
        task,
        args,
      };

      function onAbort() {
        logger.error('Task aborted.');
        recreate(new Error('Task aborted'));
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
        .then(result => {
          if (result.ctx?.heapUsed) {
            const usedPercent = result.ctx.heapUsed / (maxOldGenerationSizeMb * 1024 * 1024);
            args.span?.setAttribute('hive.composition.heap.percent', Math.round(usedPercent * 100));
          }
          return result.data;
        });
    }

    return {
      get isIdle() {
        return workerState === null && !exited && !replaced;
      },
      name,
      run,
      terminate: () => {
        replaced = true;
        return worker.terminate();
      },
    };
  }

  /** Process a composition task in a worker (once the next worker is free). */
  process(args: WorkerRunArgs): Promise<CompositionResultEvent['data']> {
    return this.queue.push({
      args: { ...args, span: args.span ?? trace.getActiveSpan() },
      addedToQueueTime: now(),
    });
  }

  /** Terminate all workers. */
  async close(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
  }
}

function now() {
  return new Date().getTime();
}
