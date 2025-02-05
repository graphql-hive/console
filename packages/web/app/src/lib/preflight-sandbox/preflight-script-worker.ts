import CryptoJS from 'crypto-js';
import CryptoJSPackageJson from 'crypto-js/package.json';
import { Kit } from '../kit';
import { ALLOWED_GLOBALS } from './allowed-globals';
import { LogMessage, WorkerEvents } from './shared-types';

interface WorkerData {
  request: {
    headers: Headers;
  };
  environmentVariables: Record<string, Kit.Json.Primitive>;
}

/**
 * Unique id for each prompt request.
 * Incremented each time a prompt is requested.
 */
let promptId = 0;
/**
 * Map of promptId to the callback that should be called when the prompt is resolved.
 * The callback is Promise.resolve of the prompt request of a given id.
 */
const promptCallbacks = new Map<number, (result: string | null) => void>();

function sendMessage(data: WorkerEvents.Outgoing.EventData) {
  postMessage(data);
}

self.onmessage = async (ev: WorkerEvents.Incoming.MessageEvent) => {
  await execute(ev.data);
};

self.addEventListener('unhandledrejection', event => {
  const error = 'reason' in event ? new Error(event.reason) : event;
  sendMessage({ type: WorkerEvents.Outgoing.Event.error, error });
});

async function execute(args: WorkerEvents.Incoming.EventData): Promise<void> {
  if (args.type === WorkerEvents.Incoming.Event.promptResponse) {
    // When a prompt response is received, resolve the promise, so `await lab.prompt` can return the value.
    const callback = promptCallbacks.get(args.promptId);
    if (!callback) {
      postMessage({
        type: WorkerEvents.Outgoing.Event.error,
        error: new Error('Prompt callback not found'),
      });
      return;
    }
    promptCallbacks.delete(args.promptId);
    // resolve
    callback(args.value);
    return;
  }

  const { script } = args;

  const workerData: WorkerData = {
    request: {
      headers: new Headers(),
    },
    // When running in worker `environmentVariables` will not be a reference to the main thread value
    // but sometimes this will be tested outside the worker, so we don't want to mutate the input in that case
    environmentVariables: { ...args.environmentVariables },
  };

  // generate list of all in scope variables, we do getOwnPropertyNames and `for in` because each contain slightly different sets of keys
  const allGlobalKeys = Object.getOwnPropertyNames(globalThis);
  for (const key in globalThis) {
    allGlobalKeys.push(key);
  }

  // filter out allowed global variables and keys that will cause problems
  const blockedGlobals = allGlobalKeys.filter(
    key =>
      // When testing in the main thread this exists on window and is not a valid argument name.
      // because global is blocked, even if this was in the worker it's still wouldn't be available because it's not a valid variable name
      !key.includes('-') &&
      !ALLOWED_GLOBALS.has(key) &&
      // window has references as indexes on the globalThis such as `globalThis[0]`, numbers are not valid arguments, so we need to filter these out
      Number.isNaN(Number(key)) &&
      // @ is not a valid argument name beginning character, so we don't need to block it and including it will cause a syntax error
      // only example currently is @wry/context which is a dep of @apollo/client and adds @wry/context:Slot
      key.charAt(0) !== '@',
  );
  // restrict window variable
  blockedGlobals.push('window');

  const log =
    (level: 'log' | 'warn' | 'error' | 'info') =>
    (...args: unknown[]) => {
      console[level](...args);
      const message = args.map(String).join(' ');
      const { line, column } = readLineAndColumn(new Error(), {
        columnOffset: 'console.'.length,
      });
      // The messages should be streamed to the main thread as they occur not gathered and send to
      // the main thread at the end of the execution of the preflight script
      // const message: LogMessage = { level, message };
      postMessage({
        type: 'log',
        message: {
          level,
          message,
          line,
          column,
        } satisfies LogMessage,
      });
    };

  function getValidEnvVariable(value: unknown) {
    if (Kit.Json.isPrimitive(value)) {
      return value;
    }
    consoleApi.warn(
      'You tried to set a non primitive type in env variables, only string, boolean, number and null are allowed in env variables. The value has been filtered out.',
    );
  }

  const consoleApi = Object.freeze({
    log: log('log'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  });

  let hasLoggedCryptoJSVersion = false;

  const labApi = Object.freeze({
    get CryptoJS() {
      if (!hasLoggedCryptoJSVersion) {
        hasLoggedCryptoJSVersion = true;
        consoleApi.info(`Using crypto-js version: ${CryptoJSPackageJson.version}`);
      }
      return CryptoJS;
    },
    environment: {
      get(key: string) {
        return Object.freeze(workerData.environmentVariables[key]);
      },
      set(key: string, value: unknown) {
        const validValue = getValidEnvVariable(value);
        if (validValue === undefined) {
          delete workerData.environmentVariables[key];
        } else {
          workerData.environmentVariables[key] = validValue;
        }
      },
    },
    request: {
      headers: workerData.request.headers,
    },
    /**
     * Mimics the `prompt` function in the browser, by sending a message to the main thread
     * and waiting for a response.
     */
    prompt(message: string, defaultValue: string) {
      return new Promise<string | null>(resolve => {
        // Increment the promptId so we can match the response to the request
        promptId++;
        // Store the resolve function so we can call it when the response is received
        promptCallbacks.set(promptId, resolve);
        // Send the prompt request to the main thread
        postMessage({ type: 'prompt', promptId, message, defaultValue });
      });
    },
  });

  // Wrap the users script in an async IIFE to allow the use of top level await
  const rawJs = `return(async()=>{'use strict';
${script}})()`;

  try {
    await Function(
      'lab',
      'console',
      // spreading all the variables we want to block creates an argument that shadows their names, any attempt to access them will result in `undefined`
      ...blockedGlobals,
      rawJs,
      // Bind the function to a null constructor object to prevent `this` leaking scope in
    ).bind(
      // When `this` is `undefined` or `null`, we get [object DedicatedWorkerGlobalScope] in console output
      // instead we set as string `'undefined'` so in console, we'll see undefined as well
      'undefined',
    )(labApi, consoleApi);
  } catch (error) {
    const { line, column } = error instanceof Error ? readLineAndColumn(error) : {};
    sendMessage({
      type: WorkerEvents.Outgoing.Event.error,
      error: {
        message: error instanceof Error ? error.message : String(error),
        line,
        column,
      },
    });
    return;
  }

  sendMessage({
    type: WorkerEvents.Outgoing.Event.result,
    environmentVariables: workerData.environmentVariables,
    request: {
      headers: Array.from(workerData.request.headers.entries()),
    },
  });
}

function readLineAndColumn(error: Error, { columnOffset = 0 } = {}) {
  const regex = /<anonymous>:(?<line>\d+):(?<column>\d+)/; // Regex to match the line and column numbers

  const { line, column } = error.stack?.match(regex)?.groups || {};
  return {
    line: Number(line) - 3,
    column: Number(column) - columnOffset,
  };
}

sendMessage({ type: WorkerEvents.Outgoing.Event.ready });
