// A worker for `worker-pool.spec.ts`, speaking the protocol of `handleWorkerTasks` (`worker-task.ts`).
// Plain JavaScript, as worker threads do not go through the TypeScript loader of vitest.
import { parentPort } from 'node:worker_threads';

parentPort.on('message', message => {
  if (message?.event !== 'task') {
    return;
  }
  const { id, data } = message;

  switch (data.kind) {
    case 'echo':
      parentPort.postMessage({ event: 'taskResult', id, data: data.value });
      return;
    case 'requestId':
      parentPort.postMessage({ event: 'taskResult', id, data: message.requestId ?? null });
      return;
    case 'sleep':
      setTimeout(
        () => parentPort.postMessage({ event: 'taskResult', id, data: data.value }),
        data.ms,
      );
      return;
    case 'hang':
      // Blocks the worker thread, like a diff of a huge schema would.
      for (;;) {}
    case 'fail':
      parentPort.postMessage({
        event: 'taskError',
        id,
        error: { name: 'Error', message: data.message, stack: undefined, source: null },
      });
      return;
    case 'crash':
      throw new Error('crashed');
  }
});
