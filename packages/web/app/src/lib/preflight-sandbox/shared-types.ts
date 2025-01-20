/* eslint-disable @typescript-eslint/no-namespace */

import { Kit } from '../kit';

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

    export namespace EventData {
      export interface ReadyEventData {
        type: Event.ready;
      }

      export interface StartEventData {
        type: Event.start;
        runId: string;
      }

      export interface LogEventData {
        type: Event.log;
        runId: string;
        log: string | Error;
      }

      export interface ResultEventData {
        type: Event.result;
        runId: string;
        environmentVariables: Record<string, string>;
        request: {
          headers: Kit.Headers.Encoded;
        };
      }

      export interface ErrorEventData {
        type: Event.error;
        runId: string;
        error: Error;
      }

      export interface PromptEventData {
        type: Event.prompt;
        runId: string;
        promptId: number;
        message: string;
        defaultValue?: string;
      }
    }

    export type EventData = {
      ready: EventData.ReadyEventData;
      start: EventData.StartEventData;
      log: EventData.LogEventData;
      prompt: EventData.PromptEventData;
      result: EventData.ResultEventData;
      error: EventData.ErrorEventData;
    }[Event];

    export type MessageEvent = _MessageEvent<EventData>;
  }

  export namespace Incoming {
    export const enum Event {
      run = 'run',
      promptResponse = 'promptResponse',
      abort = 'abort',
    }

    export namespace EventData {
      export interface RunEventData {
        type: Event.run;
        id: string;
        script: string;
        environmentVariables: Record<string, unknown>;
      }

      export interface AbortEventData {
        type: Event.abort;
        id: string;
      }

      export interface PromptResponseEventData {
        type: Event.promptResponse;
        id: string;
        promptId: number;
        value: string | null;
      }
    }

    export type EventData = {
      run: EventData.RunEventData;
      promptResponse: EventData.PromptResponseEventData;
      abort: EventData.AbortEventData;
    }[Event];

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
        request: {
          headers: Kit.Headers.Encoded;
        };
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

    export namespace EventData {
      export interface PromptResponseEventData {
        type: Event.promptResponse;
        promptId: number;
        value: string | null;
      }

      export interface RunEventData {
        type: Event.run;
        script: string;
        environmentVariables: Record<string, unknown>;
      }
    }

    export type EventData = {
      promptResponse: EventData.PromptResponseEventData;
      run: EventData.RunEventData;
    }[Event];

    export type MessageEvent = _MessageEvent<EventData>;
  }
}
