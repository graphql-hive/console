import PreflightWorker from './preflight-script-worker?worker&inline';

function postMessage(data: any) {
  window.parent.postMessage(data, '*');
}

const enum EmbedSentEvent {
  ready = 'ready',
  start = 'start',
  log = 'log',
  result = 'result',
  error = 'error',
}

const enum EmbedReceiveEvent {
  run = 'run',
  abort = 'abort',
}

type EventRun = {
  type: EmbedReceiveEvent.run;
  id: string;
  script: string;
  environmentVariables: Record<string, unknown>;
};

type EventAbort = {
  type: EmbedReceiveEvent.abort;
  id: string;
  script: string;
};

type InstructionEventData = EventRun | EventAbort;

const PREFLIGHT_TIMEOUT = 30_000;

const abortSignals = new Map<string, AbortController>();

window.addEventListener('message', (e: MessageEvent<InstructionEventData>) => {
  console.log('received event', e.data);

  if (e.data.type === EmbedReceiveEvent.run) {
    handleRunEvent(e.data);
    return;
  }
  if (e.data.type === EmbedReceiveEvent.abort) {
    abortSignals.get(e.data.id)?.abort();
    return;
  }
});

postMessage({
  type: EmbedSentEvent.ready,
});

function handleRunEvent(data: EventRun) {
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
        type: EmbedSentEvent.error,
        runId: data.id,
        error: new Error(
          `Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`,
        ),
      });
      terminate();
    }, PREFLIGHT_TIMEOUT);

    worker.addEventListener(
      'message',
      function eventListener(ev: MessageEvent<WorkerMessagePayload>) {
        console.log('received event from worker', ev.data);
        if (ev.data.type === 'ready') {
          worker.postMessage({
            script: data.script,
            environmentVariables: data.environmentVariables,
          });
          return;
        }

        if (ev.data.type === 'result') {
          postMessage({
            type: EmbedSentEvent.result,
            runId: data.id,
            environmentVariables: ev.data.environmentVariables,
            time: Date.now(),
          });
          clearTimeout(timeout);
          terminate();
          return;
        }

        if (ev.data.type === 'log') {
          postMessage({
            type: EmbedSentEvent.log,
            runId: data.id,
            log: ev.data.message,
            time: Date.now(),
          });
          return;
        }

        if (ev.data.type === 'error') {
          postMessage({
            type: EmbedSentEvent.error,
            runId: data.id,
            error: ev.data.error,
            time: Date.now(),
          });
          clearTimeout(timeout);
          terminate();
          return;
        }
      },
    );

    postMessage({
      type: EmbedSentEvent.start,
      runId: data.id,
    });
  } catch (error) {
    console.error(error);
    postMessage({
      type: EmbedSentEvent.error,
      runId: data.id,
      error,
      time: Date.now(),
    });
    terminate();
  }
}

type WorkerPayloadLog = { type: 'log'; message: string };
type WorkerPayloadError = { type: 'error'; error: Error };
type WorkerPayloadResult = { type: 'result'; environmentVariables: Record<string, unknown> };
type WorkerPayloadReady = { type: 'ready' };

type WorkerMessagePayload =
  | WorkerPayloadResult
  | WorkerPayloadLog
  | WorkerPayloadError
  | WorkerPayloadReady;
