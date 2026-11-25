import { Worker } from 'node:worker_threads';
import {
  getRequestId,
  injectActiveTraceContext,
  metrics,
  setErrorSource,
} from '@hive/service-common';
import type { Logger } from '../providers/logger';
import {
  deserializeWorkerError,
  type WorkerTaskEvent,
  type WorkerTaskResultEvent,
} from './worker-task';

const msBuckets = [5, 25, 100, 250, 1_000, 2_500, 10_000, 30_000];

const queueDuration = new metrics.Histogram({
  name: 'worker_pool_queue_duration_ms',
  help: 'Time a task waited for an idle worker.',
  labelNames: ['pool'],
  buckets: msBuckets,
});

const taskDuration = new metrics.Histogram({
  name: 'worker_pool_task_duration_ms',
  help: 'Time a worker spent on a task.',
  labelNames: ['pool', 'status' /* ok, error, timeout, crash */],
  buckets: msBuckets,
});

type QueuedTask<TInput, TOutput> = {
  id: string;
  data: TInput;
  enqueuedAt: number;
  traceContext: Record<string, string>;
  requestId: string | undefined;
  resolve: (data: TOutput) => void;
  reject: (error: unknown) => void;
};

type RunningTask<TInput, TOutput> = QueuedTask<TInput, TOutput> & {
  startedAt: number;
  timeout: ReturnType<typeof setTimeout>;
};

type Slot<TInput, TOutput> = {
  worker: Worker;
  task: RunningTask<TInput, TOutput> | null;
};

export type WorkerPoolOptions = {
  /** Used for the worker thread names, logs and metrics. */
  name: string;
  /** Path of the worker script, which calls `handleWorkerTasks`. */
  scriptPath: string;
  /** The amount of worker threads. Each one processes a single task at a time. */
  size: number;
  maxOldGenerationSizeMb: number;
  /** A task running longer is rejected and its worker is replaced. */
  timeoutMs: number;
  logger: Logger;
};

/**
 * A fixed amount of worker threads for CPU heavy tasks, so they do not block the event loop.
 * Tasks wait in a FIFO queue until a worker is idle.
 * A worker that crashes, runs out of memory or exceeds the timeout is replaced.
 */
export class WorkerPool<TInput, TOutput> {
  private slots: Array<Slot<TInput, TOutput>>;
  private queue: Array<QueuedTask<TInput, TOutput>> = [];
  private logger: Logger;
  private closed = false;

  constructor(private options: WorkerPoolOptions) {
    if (options.size < 1) {
      throw new Error('A worker pool needs at least one worker.');
    }
    this.logger = options.logger.child({ source: 'WorkerPool', pool: options.name });
    this.slots = Array.from({ length: options.size }, (_, index) => this.createSlot(index));
  }

  run(data: TInput): Promise<TOutput> {
    if (this.closed) {
      return Promise.reject(new Error(`Worker pool ${this.options.name} is closed.`));
    }

    const { promise, resolve, reject } = Promise.withResolvers<TOutput>();
    this.queue.push({
      id: crypto.randomUUID(),
      data,
      enqueuedAt: Date.now(),
      traceContext: injectActiveTraceContext(),
      requestId: getRequestId(),
      resolve,
      reject,
    });
    this.dispatch();
    return promise;
  }

  async close(): Promise<void> {
    this.closed = true;
    const error = new Error(`Worker pool ${this.options.name} is closed.`);
    for (const task of this.queue.splice(0)) {
      task.reject(error);
    }
    await Promise.all(
      this.slots.map(slot => {
        this.finish(slot, 'crash')?.reject(error);
        return slot.worker.terminate();
      }),
    );
  }

  private createSlot(index: number): Slot<TInput, TOutput> {
    const name = `${this.options.name}-worker-${index}`;
    const worker = new Worker(this.options.scriptPath, {
      name,
      resourceLimits: { maxOldGenerationSizeMb: this.options.maxOldGenerationSizeMb },
    });
    // Idle workers should not keep the process alive.
    worker.unref();

    const slot: Slot<TInput, TOutput> = { worker, task: null };

    worker.on('message', (message: WorkerTaskResultEvent<TOutput>) => {
      if (message?.event !== 'taskResult' && message?.event !== 'taskError') {
        return;
      }
      if (slot.task?.id !== message.id) {
        return;
      }

      if (message.event === 'taskResult') {
        this.finish(slot, 'ok')?.resolve(message.data);
      } else {
        this.finish(slot, 'error')?.reject(deserializeWorkerError(message.error));
      }
      this.dispatch();
    });

    worker.on('error', error => {
      this.logger.error('Worker error (worker=%s, error=%s)', name, String(error));
      this.replace(index, slot, setErrorSource(error, this.options.name));
    });

    worker.on('exit', code => {
      this.replace(
        index,
        slot,
        setErrorSource(
          new Error(`Worker exited unexpectedly (code=${String(code)}).`),
          this.options.name,
        ),
      );
    });

    return slot;
  }

  /** Replaces the worker of a slot, rejecting the task it was running. */
  private replace(index: number, slot: Slot<TInput, TOutput>, reason: Error, status = 'crash') {
    if (this.slots[index] !== slot) {
      // Already replaced.
      return;
    }

    if (!this.closed) {
      this.logger.debug('Replacing worker (index=%s, reason=%s)', index, reason.message);
      this.slots[index] = this.createSlot(index);
    }

    this.finish(slot, status)?.reject(reason);
    void slot.worker.terminate().catch(() => {});
    this.dispatch();
  }

  /** Marks the slot as idle and returns the task it was running. */
  private finish(slot: Slot<TInput, TOutput>, status: string) {
    const task = slot.task;
    if (!task) {
      return null;
    }
    slot.task = null;
    clearTimeout(task.timeout);
    slot.worker.unref();
    taskDuration.observe({ pool: this.options.name, status }, Date.now() - task.startedAt);
    return task;
  }

  private dispatch() {
    if (this.closed) {
      return;
    }

    for (let index = 0; index < this.slots.length && this.queue.length > 0; index++) {
      const slot = this.slots[index];
      if (slot.task) {
        continue;
      }

      const queued = this.queue.shift()!;
      const startedAt = Date.now();
      queueDuration.observe({ pool: this.options.name }, startedAt - queued.enqueuedAt);

      slot.task = {
        ...queued,
        startedAt,
        timeout: setTimeout(() => {
          this.logger.error('Task timed out (index=%s, taskId=%s)', index, queued.id);
          this.replace(
            index,
            slot,
            setErrorSource(
              new Error(`Timeout, worker did not respond within ${this.options.timeoutMs}ms.`),
              this.options.name,
            ),
            'timeout',
          );
        }, this.options.timeoutMs),
      };
      // A busy worker keeps the process alive until the task is done.
      slot.worker.ref();
      slot.worker.postMessage({
        event: 'task',
        id: queued.id,
        data: queued.data,
        traceContext: queued.traceContext,
        requestId: queued.requestId,
        enqueuedAt: queued.enqueuedAt,
      } satisfies WorkerTaskEvent<TInput>);
    }
  }
}
