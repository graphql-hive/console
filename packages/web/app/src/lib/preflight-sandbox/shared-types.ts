/* eslint-disable @typescript-eslint/no-namespace */

type _MessageEvent<T> = MessageEvent<T>;

export namespace IFrameEvents {
  export namespace Outgoing {
    export const enum Event {
      ready = 'ready',
      start = 'start',
      log = 'log',
      result = 'result',
      error = 'error',
    }

    type ReadyEventData = {
      type: Event.ready;
    };

    type StartEventData = {
      type: Event.start;
      runId: string;
    };

    type LogEventData = {
      type: Event.log;
      runId: string;
      log: string | Error;
    };

    type ResultEventData = {
      type: Event.result;
      runId: string;
      environmentVariables: Record<string, unknown>;
    };

    type ErrorEventData = {
      type: Event.error;
      runId: string;
      error: Error;
    };

    export type EventData =
      | ReadyEventData
      | StartEventData
      | LogEventData
      | ResultEventData
      | ErrorEventData;

    export type MessageEvent = _MessageEvent<EventData>;
  }

  export namespace Incoming {
    export const enum Event {
      run = 'run',
      abort = 'abort',
    }

    export type RunEventData = {
      type: Event.run;
      id: string;
      script: string;
      environmentVariables: Record<string, unknown>;
    };

    type AbortEventData = {
      type: Event.abort;
      id: string;
      script: string;
    };

    type EventData = RunEventData | AbortEventData;

    export type MessageEvent = _MessageEvent<EventData>;
  }
}

export namespace WorkerEvents {
  export namespace Outgoing {
    export const enum Event {
      ready = 'ready',
      log = 'log',
      result = 'result',
      error = 'error',
      prompt = 'prompt',
    }

    type LogEventData = { type: Event.log; message: string };
    type ErrorEventData = { type: Event.error; error: Error };
    type PromptEventData = {
      type: Event.prompt;
      promptId: number;
      message: string;
      defaultValue: string;
    };
    type ResultEventData = { type: Event.result; environmentVariables: Record<string, unknown> };
    type ReadyEventData = { type: Event.ready };

    export type EventData =
      | ResultEventData
      | LogEventData
      | ErrorEventData
      | ReadyEventData
      | PromptEventData;
    export type MessageEvent = _MessageEvent<EventData>;
  }

  export namespace Incoming {
    export const enum Event {
      run = 'run',
      promptResponse = 'promptResponse',
    }

    type PromptResponseEventData = {
      type: Event.promptResponse;
      promptId: number;
      value: string | null;
    };

    type RunEventData = {
      type: Event.run;
      script: string;
      environmentVariables: Record<string, unknown>;
    };

    export type EventData = PromptResponseEventData | RunEventData;
    export type MessageEvent = _MessageEvent<EventData>;
  }
}
