import { Kit } from '../kit';
import PreflightWorker from './preflight-script-worker?worker&inline';
import { IFrameEvents, WorkerEvents } from './shared-types';

function postMessage(data: IFrameEvents.Outgoing.EventData) {
  window.parent.postMessage(data, '*');
}

const PREFLIGHT_TIMEOUT = 30_000;

const abortSignals = new Map<string, AbortController>();

const workers = new Map<string, Worker>();

window.addEventListener('message', (e: IFrameEvents.Incoming.MessageEvent) => {
  handleEvent(e.data);
});

postMessage({
  type: IFrameEvents.Outgoing.Event.ready,
});

function handleEvent(data: IFrameEvents.Incoming.EventData) {
  if (data.type === IFrameEvents.Incoming.Event.abort) {
    abortSignals.get(data.id)?.abort();
    return;
  }

  if (data.type === IFrameEvents.Incoming.Event.promptResponse) {
    const worker = workers.get(data.id);

    if (!worker) {
      // Worker has already been terminated
      return;
    }

    worker.postMessage({
      type: WorkerEvents.Incoming.Event.promptResponse,
      promptId: data.promptId,
      value: data.value,
    } satisfies WorkerEvents.Incoming.EventData);

    return;
  }

  let worker: Worker;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const runId = data.id;

  function terminate() {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (worker) {
      worker.terminate();
    }
    abortSignals.delete(runId);
    workers.delete(runId);
  }

  const controller = new AbortController();

  controller.signal.onabort = terminate;
  abortSignals.set(runId, controller);

  try {
    worker = new PreflightWorker();
    workers.set(runId, worker);

    timeout = setTimeout(() => {
      postMessage({
        type: IFrameEvents.Outgoing.Event.error,
        runId,
        error: new Error(
          `Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`,
        ),
      });
      terminate();
    }, PREFLIGHT_TIMEOUT);

    worker.addEventListener(
      'message',
      function eventListener(ev: WorkerEvents.Outgoing.MessageEvent) {
        if (ev.data.type === WorkerEvents.Outgoing.Event.ready) {
          worker.postMessage({
            type: WorkerEvents.Incoming.Event.run,
            script: data.script,
            environmentVariables: data.environmentVariables,
          } satisfies WorkerEvents.Incoming.EventData);
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.prompt) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.prompt,
            runId,
            promptId: ev.data.promptId,
            message: ev.data.message,
            defaultValue: ev.data.defaultValue,
          });
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.result) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.result,
            runId,
            environmentVariables: ev.data.environmentVariables,
            request: ev.data.request,
          });
          terminate();
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.log) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.log,
            runId,
            log: ev.data.message,
          });
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.error) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.error,
            runId,
            error: ev.data.error,
          });
          terminate();
          return;
        }

        Kit.neverCase(ev.data);
      },
    );

    postMessage({
      type: IFrameEvents.Outgoing.Event.start,
      runId,
    });
  } catch (error) {
    console.error(error);
    postMessage({
      type: IFrameEvents.Outgoing.Event.error,
      runId,
      error: error as Error,
    });
    terminate();
  }
}
