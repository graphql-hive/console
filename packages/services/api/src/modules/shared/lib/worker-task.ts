/**
 * The protocol between a `WorkerPool` (main thread) and its worker threads.
 * Kept apart from the pool, so worker threads do not load the pool (and its metrics).
 */
import type { MessagePort } from 'node:worker_threads';
import { getErrorSource, setErrorSource } from '@hive/service-common';

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
};

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
 * Runs `handler` for every task the `WorkerPool` sends to this worker thread.
 * An error thrown by `handler` rejects the task but keeps the worker alive.
 */
export function handleWorkerTasks<TInput, TOutput>(
  port: MessagePort,
  handler: (data: TInput) => Promise<TOutput> | TOutput,
) {
  port.on('message', async (message: WorkerTaskEvent<TInput>) => {
    if (message?.event !== 'task') {
      return;
    }

    try {
      const data = await handler(message.data);
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
  });
}
