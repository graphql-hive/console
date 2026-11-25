/**
 * The protocol between a `WorkerPool` (main thread) and its worker threads.
 * Kept apart from the pool, so worker threads do not load the pool (and its metrics).
 */
import type { MessagePort } from 'node:worker_threads';
import {
  getErrorSource,
  requestIdStorage,
  setErrorSource,
  withTraceContext,
} from '@hive/service-common';

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

export type WorkerTaskEvent<TInput> = {
  event: 'task';
  id: string;
  data: TInput;
  traceContext: Record<string, string>;
  requestId: string | undefined;
  enqueuedAt: number;
};

/** Information about a task, besides its input. */
export type WorkerTaskMeta = Omit<WorkerTaskEvent<unknown>, 'event' | 'data'>;

export type WorkerTaskResultEvent<TOutput> =
  | {
      event: 'taskResult';
      id: string;
      data: TOutput;
    }
  | {
      event: 'taskError';
      id: string;
      error: SerializedWorkerError;
    };

/**
 * Runs `handler` for every task the `WorkerPool` sends to this worker thread,
 * within the trace context and request id of the caller.
 * An error thrown by `handler` rejects the task but keeps the worker alive.
 */
export function handleWorkerTasks<TInput, TOutput>(
  port: MessagePort,
  handler: (data: TInput, meta: WorkerTaskMeta) => Promise<TOutput> | TOutput,
) {
  port.on('message', (message: WorkerTaskEvent<TInput>) => {
    if (message?.event !== 'task') {
      return;
    }

    const run = () => void processTask(message);
    withTraceContext(message.traceContext, () =>
      message.requestId ? requestIdStorage.run({ requestId: message.requestId }, run) : run(),
    );
  });

  async function processTask(message: WorkerTaskEvent<TInput>) {
    const { event: _event, data: input, ...meta } = message;
    try {
      const data = await handler(input, meta);
      port.postMessage({
        event: 'taskResult',
        id: message.id,
        data,
      } satisfies WorkerTaskResultEvent<TOutput>);
    } catch (error) {
      port.postMessage({
        event: 'taskError',
        id: message.id,
        error: serializeWorkerError(error),
      } satisfies WorkerTaskResultEvent<TOutput>);
    }
  }
}
