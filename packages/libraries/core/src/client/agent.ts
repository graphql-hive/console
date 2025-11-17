import { version } from '../version.js';
import { http } from './http-client.js';
import type { Logger } from './types.js';
import { createHiveLogger } from './utils.js';

type ReadOnlyResponse = Pick<Response, 'status' | 'text' | 'json' | 'statusText'>;

export interface AgentOptions {
  enabled?: boolean;
  name?: string;
  version?: string;
  /**
   * Hive endpoint or proxy
   */
  endpoint: string;
  /**
   * API Token
   */
  token: string;
  /**
   * 30s by default
   */
  timeout?: number;
  /**
   * false by default
   */
  debug?: boolean;
  /**
   * 5 by default
   */
  maxRetries?: number;
  /**
   * 200 by default
   */
  minTimeout?: number;
  /**
   * Send reports in interval (defaults to 10_000ms)
   */
  sendInterval?: number;
  /**
   * Max number of traces to send at once (defaults to 25)
   */
  maxSize?: number;
  /**
   * Custom logger (defaults to console)
   */
  logger?: Logger;
  /**
   * WHATWG Compatible fetch implementation
   * used by the agent to send reports
   */
  fetch?: typeof fetch;
}

export function createAgent<TEvent>(
  pluginOptions: AgentOptions,
  {
    data,
    body,
    headers = () => ({}),
  }: {
    data: {
      clear(): void;
      set(data: TEvent): void;
      size(): number;
    };
    body(): Buffer | string | Promise<string | Buffer>;
    headers?(): Record<string, string>;
  },
) {
  const options: Required<Omit<AgentOptions, 'fetch' | 'debug' | 'logger'>> = {
    timeout: 30_000,
    enabled: true,
    minTimeout: 200,
    maxRetries: 3,
    sendInterval: 10_000,
    maxSize: 25,
    name: 'hive-client',
    version,
    ...pluginOptions,
  };
  const logger = createHiveLogger(pluginOptions.logger ?? console, '[agent]', pluginOptions.debug);
  const enabled = options.enabled !== false;
  let timeoutID: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }

    timeoutID = setTimeout(send, options.sendInterval);
  }

  let scheduled = false;
  let inProgressCaptures: Promise<void>[] = [];

  function capture(event: TEvent | Promise<TEvent>) {
    if (event instanceof Promise) {
      const promise = captureAsync(event);
      inProgressCaptures.push(promise);
      void promise.finally(() => {
        inProgressCaptures = inProgressCaptures.filter(p => p !== promise);
      });
    } else {
      captureSync(event);
    }
  }

  async function captureAsync(event: Promise<TEvent>) {
    captureSync(await event);
  }

  function captureSync(event: TEvent) {
    // Calling capture starts the schedule
    if (!scheduled) {
      scheduled = true;
      schedule();
    }

    data.set(event);

    if (data.size() >= options.maxSize) {
      logger.debug('Sending immediately');
      setImmediate(() => send({ throwOnError: false, skipSchedule: true }));
    }
  }

  function sendImmediately(event: TEvent): Promise<ReadOnlyResponse | null> {
    data.set(event);
    logger.debug('Sending immediately');
    return send({ throwOnError: true, skipSchedule: true });
  }

  async function send(sendOptions?: {
    throwOnError?: boolean;
    skipSchedule: boolean;
  }): Promise<ReadOnlyResponse | null> {
    if (!data.size() || !enabled) {
      if (!sendOptions?.skipSchedule) {
        schedule();
      }
      return null;
    }

    const buffer = await body();
    const dataToSend = data.size();

    data.clear();

    logger.debug(`Sending report (queue ${dataToSend})`);
    const response = await http
      .post(options.endpoint, buffer as any, {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          Authorization: `Bearer ${options.token}`,
          'User-Agent': `${options.name}/${options.version}`,
          ...headers(),
        },
        timeout: options.timeout,
        retry: {
          retries: options.maxRetries,
          factor: 2,
        },
        logger,
        fetchImplementation: pluginOptions.fetch,
      })
      .then(res => {
        logger.debug(`Report sent!`);
        return res;
      })
      .catch(error => {
        logger.debug(`Failed to send report.`);

        if (sendOptions?.throwOnError) {
          throw error;
        }

        return null;
      })
      .finally(() => {
        if (!sendOptions?.skipSchedule) {
          schedule();
        }
      });

    return response;
  }

  async function dispose() {
    logger.debug('Disposing');
    if (timeoutID) {
      clearTimeout(timeoutID);
    }

    if (inProgressCaptures.length) {
      await Promise.all(inProgressCaptures);
    }

    await send({
      skipSchedule: true,
      throwOnError: false,
    });
  }

  return {
    capture,
    sendImmediately,
    dispose,
  };
}
