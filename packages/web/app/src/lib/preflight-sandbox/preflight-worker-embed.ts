import PreflightWorker from './preflight-script-worker?worker&inline';
import { IFrameEvents, WorkerEvents } from './shared-types';

function postMessage(data: IFrameEvents.Outgoing.EventData) {
  window.parent.postMessage(data, '*');
}

const PREFLIGHT_TIMEOUT = 30_000;

const abortSignals = new Map<string, AbortController>();

window.addEventListener('message', (e: IFrameEvents.Incoming.MessageEvent) => {
  console.log('received event', e.data);

  if (e.data.type === IFrameEvents.Incoming.Event.run) {
    handleRunEvent(e.data);
    return;
  }
  if (e.data.type === IFrameEvents.Incoming.Event.abort) {
    abortSignals.get(e.data.id)?.abort();
    return;
  }
});

postMessage({
  type: IFrameEvents.Outgoing.Event.ready,
});

function handleRunEvent(data: IFrameEvents.Incoming.RunEventData) {
  let worker: Worker;

  function terminate() {
    if (worker) {
      worker.terminate();
    }
    abortSignals.delete(data.id);
  }

  const controller = new AbortController();

  controller.signal.onabort = terminate;
  abortSignals.set(data.id, controller);

  try {
    worker = new PreflightWorker();

    const timeout = setTimeout(() => {
      postMessage({
        type: IFrameEvents.Outgoing.Event.error,
        runId: data.id,
        error: new Error(
          `Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`,
        ),
      });
      terminate();
    }, PREFLIGHT_TIMEOUT);

    worker.addEventListener(
      'message',
      function eventListener(ev: WorkerEvents.Outgoing.MessageEvent) {
        console.log('received event from worker', ev.data);
        if (ev.data.type === WorkerEvents.Outgoing.Event.ready) {
          worker.postMessage({
            type: WorkerEvents.Incoming.Event.run,
            script: data.script,
            environmentVariables: data.environmentVariables,
          } satisfies WorkerEvents.Incoming.EventData);
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.prompt) {
          const promptResult = window.parent.prompt(ev.data.message, ev.data.defaultValue);
          worker.postMessage({
            type: WorkerEvents.Incoming.Event.promptResponse,
            promptId: ev.data.promptId,
            value: promptResult,
          } satisfies WorkerEvents.Incoming.EventData);
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.result) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.result,
            runId: data.id,
            environmentVariables: ev.data.environmentVariables,
          });
          clearTimeout(timeout);
          terminate();
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.log) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.log,
            runId: data.id,
            log: ev.data.message,
          });
          return;
        }

        if (ev.data.type === WorkerEvents.Outgoing.Event.error) {
          postMessage({
            type: IFrameEvents.Outgoing.Event.error,
            runId: data.id,
            error: ev.data.error,
          });
          clearTimeout(timeout);
          terminate();
          return;
        }
      },
    );

    postMessage({
      type: IFrameEvents.Outgoing.Event.start,
      runId: data.id,
    });
  } catch (error) {
    console.error(error);
    postMessage({
      type: IFrameEvents.Outgoing.Event.error,
      runId: data.id,
      error: error as Error,
    });
    terminate();
  }
}
