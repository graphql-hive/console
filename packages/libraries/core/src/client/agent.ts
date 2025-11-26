import CircuitBreaker from '../circuit-breaker/circuit.js';
import { version } from '../version.js';
import { http } from './http-client.js';
import type { LegacyLogger } from './types.js';
import { chooseLogger } from './utils.js';

type ReadOnlyResponse = Pick<Response, 'status' | 'text' | 'json' | 'statusText'>;

export type AgentCircuitBreakerConfiguration = {
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
  errorThresholdPercentage: 50,
  volumeThreshold: 10,
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
   * Custom logger.
   *
   * Default: console based logger
   *
   * @deprecated Instead, provide a logger for the root Hive SDK. If a logger is provided on the root Hive SDK, this one is ignored.
   */
  logger?: LegacyLogger;
  /**
   * Circuit Breaker Configuration.
   * true -> Use default configuration
   * false -> Disable
   * object -> use custom configuration see {AgentCircuitBreakerConfiguration}
   */
  circuitBreaker?: boolean | AgentCircuitBreakerConfiguration;
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
  const options: Required<Omit<AgentOptions, 'fetch' | 'debug' | 'logger' | 'circuitBreaker'>> & {
    circuitBreaker: AgentCircuitBreakerConfiguration | null;
  } = {
    timeout: 30_000,
    enabled: true,
    minTimeout: 200,
    maxRetries: 3,
    sendInterval: 10_000,
    maxSize: 25,
    name: 'hive-client',
    version,
    ...pluginOptions,
    circuitBreaker:
      pluginOptions.circuitBreaker == null || pluginOptions.circuitBreaker === true
        ? defaultCircuitBreakerConfiguration
        : pluginOptions.circuitBreaker === false
          ? null
          : pluginOptions.circuitBreaker,
  };
  const logger = chooseLogger(pluginOptions.logger).child({ module: 'hive-agent' });

  let circuitBreaker: CircuitBreakerInterface<
    Parameters<typeof sendHTTPCall>,
    ReturnType<typeof sendHTTPCall>
  >;

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

  async function sendHTTPCall(buffer: string | Buffer<ArrayBufferLike>): Promise<Response> {
    const signal = circuitBreaker.getSignal();
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
      logger,
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

    logger.debug(`Sending report (queue ${dataToSend})`);
    const response = sendFromBreaker(buffer)
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

    circuitBreaker.shutdown();
  }

  if (options.circuitBreaker) {
    const circuitBreakerInstance = new CircuitBreaker(sendHTTPCall, {
      ...options.circuitBreaker,
      timeout: false,
      autoRenewAbortController: true,
    });
    circuitBreaker = circuitBreakerInstance;

    circuitBreakerInstance.on('open', () =>
      logger.error('circuit opened - backend seems unreachable.'),
    );
    circuitBreakerInstance.on('halfOpen', () =>
      logger.info('circuit half open - testing backend connectivity'),
    );
    circuitBreakerInstance.on('close', () => logger.info('circuit closed - backend recovered '));
  } else {
    circuitBreaker = {
      getSignal() {
        return undefined;
      },
      fire: sendHTTPCall,
      shutdown() {},
    };
  }

  async function sendFromBreaker(...args: Parameters<typeof circuitBreaker.fire>) {
    try {
      return await circuitBreaker.fire(...args);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'EOPENBREAKER') {
        logger.info('circuit open - sending report skipped');
        return null;
      }

      throw err;
    }
  }

  return {
    capture,
    sendImmediately,
    dispose,
  };
}

type CircuitBreakerInterface<TI extends unknown[] = unknown[], TR = unknown> = {
  fire(...args: TI): TR;
  getSignal(): AbortSignal | undefined;
  shutdown(): void;
};
