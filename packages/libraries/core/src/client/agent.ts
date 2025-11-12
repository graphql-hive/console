import CircuitBreaker from 'opossum';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { version } from '../version.js';
import { http } from './http-client.js';
import type { Logger } from './types.js';
import { createHiveLogger } from './utils.js';

type ReadOnlyResponse = Pick<Response, 'status' | 'text' | 'json' | 'statusText'>;

export type AgentCircuitBreakerConfiguration = {
  /**
   * After which time a request should be treated as a timeout in milleseconds
   * Default: 5_000
   */
  timeout: number;
  /**
   * Percentage after what the circuit breaker should kick in.
   * Default: 50
   */
  errorThresholdPercentage: number;
  /**
   * Count of requests before starting evaluating.
   * Default: 5
   */
  volumeThreshold: number;
  /**
   * After what time the circuit breaker is attempting to retry sending requests in milliseconds
   * Default: 30_000
   */
  resetTimeout: number;
};

const defaultCircuitBreakerConfiguration: AgentCircuitBreakerConfiguration = {
  timeout: 5_000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeout: 30_000,
};

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
  fetch?: typeof defaultFetch;
  /**
   * Circuit Breaker Configuration
   */
  circuitBreaker?: AgentCircuitBreakerConfiguration;
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
  const options: Required<Omit<AgentOptions, 'fetch'>> = {
    timeout: 30_000,
    debug: false,
    enabled: true,
    minTimeout: 200,
    maxRetries: 3,
    sendInterval: 10_000,
    maxSize: 25,
    name: 'hive-client',
    circuitBreaker: defaultCircuitBreakerConfiguration,
    version,
    ...pluginOptions,
    logger: createHiveLogger(pluginOptions.logger ?? console, '[agent]'),
  };

  const enabled = options.enabled !== false;

  let timeoutID: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }

    timeoutID = setTimeout(send, options.sendInterval);
  }

  function debugLog(msg: string) {
    if (options.debug) {
      options.logger.info(msg);
    }
  }

  function errorLog(msg: string) {
    options.logger.error(msg);
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
      debugLog('Sending immediately');
      setImmediate(() => send({ throwOnError: false, skipSchedule: true }));
    }
  }

  function sendImmediately(event: TEvent): Promise<ReadOnlyResponse | null> {
    data.set(event);
    debugLog('Sending immediately');
    return send({ throwOnError: true, skipSchedule: true });
  }

  async function sendHTTPCall(buffer: string | Buffer<ArrayBufferLike>) {
    // @ts-expect-error missing definition in typedefs for `opposum`
    const signal: AbortSignal = breaker.getSignal();
    return await http.post(options.endpoint, buffer, {
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
      logger: options.logger,
      fetchImplementation: pluginOptions.fetch,
      signal,
    });
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

    debugLog(`Sending report (queue ${dataToSend})`);
    const response = sendFromBreaker(buffer)
      .then(res => {
        debugLog(`Report sent!`);
        return res;
      })
      .catch(error => {
        errorLog(`Failed to send report.`);

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
    debugLog('Disposing');
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

  const breaker = new CircuitBreaker(sendHTTPCall, {
    ...options.circuitBreaker,
    autoRenewAbortController: true,
  });

  const breakerLogger = createHiveLogger(options.logger, ' [circuit breaker]');

  async function sendFromBreaker(...args: Parameters<typeof breaker.fire>) {
    try {
      return await breaker.fire(...args);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        if (err.code === 'EOPENBREAKER') {
          breakerLogger.info('circuit open - sending report skipped');
          return null;
        }
        if (err.code === 'ETIMEDOUT') {
          breakerLogger.info('circuit open - sending report aborted - timed out');
          return null;
        }
      }

      throw err;
    }
  }

  breaker.on('open', () => breakerLogger.error('circuit opened - backend seems unreachable.'));
  breaker.on('halfOpen', () =>
    breakerLogger.info('circuit half open - testing backend connectivity'),
  );
  breaker.on('close', () => breakerLogger.info('circuit closed - backend recovered '));

  return {
    capture,
    sendImmediately,
    dispose,
  };
}
