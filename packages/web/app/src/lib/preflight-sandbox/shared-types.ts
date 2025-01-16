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
      prompt = 'prompt',
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

    export interface ResultEventData extends Omit<WorkerEvents.Outgoing.EventData.Result, 'type'> {
      type: Event.result;
      runId: string;
    }
    type ErrorEventData = {
      type: Event.error;
      runId: string;
      error: Error;
    };

    type PromptEventData = {
      type: Event.prompt;
      runId: string;
      promptId: number;
      message: string;
      defaultValue?: string;
    };

    export type EventData =
      | ReadyEventData
      | StartEventData
      | LogEventData
      | PromptEventData
      | ResultEventData
      | ErrorEventData;

    export type MessageEvent = _MessageEvent<EventData>;
  }

  export namespace Incoming {
    export const enum Event {
      run = 'run',
      promptResponse = 'promptResponse',
      abort = 'abort',
    }

    type RunEventData = {
      type: Event.run;
      id: string;
      script: string;
      environmentVariables: Record<string, unknown>;
    };

    type AbortEventData = {
      type: Event.abort;
      id: string;
    };

    type PromptResponseEventData = {
      type: Event.promptResponse;
      id: string;
      promptId: number;
      value: string | null;
    };

    export type EventData = RunEventData | AbortEventData | PromptResponseEventData;
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

    export namespace EventData {
      export interface Log {
        type: Event.log;
        message: string;
      }

      export interface Error {
        type: Event.error;
        error: globalThis.Error;
      }

      export interface Prompt {
        type: Event.prompt;
        promptId: number;
        message: string;
        defaultValue: string;
      }

      export interface Result {
        type: Event.result;
        environmentVariables: Record<string, string>;
        headers: [name: string, value: string][];
      }

      export interface Ready {
        type: Event.ready;
      }
    }

    export type EventData = {
      log: EventData.Log;
      error: EventData.Error;
      prompt: EventData.Prompt;
      result: EventData.Result;
      ready: EventData.Ready;
    }[Event];

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
