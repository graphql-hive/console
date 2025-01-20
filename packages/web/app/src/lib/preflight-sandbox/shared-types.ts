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
      export interface Ready {
        type: Event.ready;
      }

      export interface Start {
        type: Event.start;
        runId: string;
      }

      export interface Log {
        type: Event.log;
        runId: string;
        log: string | globalThis.Error;
      }

      export interface Result {
        type: Event.result;
        runId: string;
        environmentVariables: Record<string, string>;
        request: {
          headers: Kit.Headers.Encoded;
        };
      }

      export interface Error {
        type: Event.error;
        runId: string;
        error: globalThis.Error;
      }

      export interface Prompt {
        type: Event.prompt;
        runId: string;
        promptId: number;
        message: string;
        defaultValue?: string;
      }
    }

    export type EventData = {
      ready: EventData.Ready;
      start: EventData.Start;
      log: EventData.Log;
      prompt: EventData.Prompt;
      result: EventData.Result;
      error: EventData.Error;
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
      export interface Run {
        type: Event.run;
        id: string;
        script: string;
        environmentVariables: Record<string, unknown>;
      }

      export interface Abort {
        type: Event.abort;
        id: string;
      }

      export interface PromptResponse {
        type: Event.promptResponse;
        id: string;
        promptId: number;
        value: string | null;
      }
    }

    export type EventData = {
      run: EventData.Run;
      promptResponse: EventData.PromptResponse;
      abort: EventData.Abort;
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
      export interface PromptResponse {
        type: Event.promptResponse;
        promptId: number;
        value: string | null;
      }

      export interface Run {
        type: Event.run;
        script: string;
        environmentVariables: Record<string, unknown>;
      }
    }

    export type EventData = {
      promptResponse: EventData.PromptResponse;
      run: EventData.Run;
    }[Event];

    export type MessageEvent = _MessageEvent<EventData>;
  }
}
