import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import fastq from 'fastq';
import { registerWorkerLogging, type Logger } from '../../api/src/modules/shared/providers/logger';
import type { CompositionEvent, CompositionResultEvent } from './composition-worker';

type WWorker = {
  state: 'idle' | 'processing';
  run: (input: CompositionEvent['data']) => Promise<CompositionResultEvent['data']>;
};

export class CompositionScheduler {
  private logger: Logger;
  /** The amount of parallel workers */
  private size: number;
  /** List of all workers */
  private workers: Array<WWorker>;

  private queue: fastq.queueAsPromised<CompositionEvent['data'], CompositionResultEvent['data']>;

  constructor(logger: Logger, size: number) {
    this.size = size;
    this.logger = logger.child({ source: 'CompositionScheduler' });
    const workers = Array.from({ length: this.size }, (_, i) => this.createWorker(i));
    this.workers = workers;

    this.queue = fastq.promise(
      function queue(data) {
        const worker = workers.find(worker => worker.state === 'idle');
        if (!worker) {
          throw new Error('No idle worker found.');
        }
        return worker.run(data);
      },
      // The size needs to be the same as the length of `this.workers`.
      // Otherwise a worker would process more than a single task at a time.
      this.size,
    );
  }

  private createWorker(index: number) {
    this.logger.debug('Creating worker %s', index);
    const name = `composition-worker-${index}`;
    const worker = new Worker(path.join(__dirname, 'composition-worker-main.js'), {
      name,
      // TODO: Provide resource limits
      resourceLimits: {},
    });
    const tasks = new Map<string, Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'>>();

    worker.on('error', error => {
      console.error(error);
      this.logger.error('Worker error %s', error);
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
        task.reject(new Error('Worker stopped.'));
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

    const { logger } = this;

    return {
      state: 'idle' as const,
      run(data: CompositionEvent['data']) {
        if (this.state !== 'idle') {
          throw new Error('Can not run task in worker that is not idle.');
        }
        this.state = 'processing';
        const id = crypto.randomUUID();
        const d = Promise.withResolvers<CompositionResultEvent>();
        const timeout = setTimeout(() => {
          task.reject(new Error('Timeout, worker did not respond within time.'));
        }, 30_000);

        const task: Omit<PromiseWithResolvers<CompositionResultEvent>, 'promise'> = {
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
          event: 'composition',
          id,
          data,
        } satisfies CompositionEvent);

        return d.promise
          .finally(() => {
            this.state = 'idle';
            const endTime = process.hrtime(time);
            logger.debug('Time taken: %ds %dms', endTime[0], endTime[1] / 1000000);
          })
          .then(result => result.data);
      },
    } satisfies WWorker;
  }

  /** Process a composition task in a worker (once the next worker is free). */
  process(data: CompositionEvent['data']): Promise<CompositionResultEvent['data']> {
    return this.queue.push(data);
  }
}
