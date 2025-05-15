export function waitFor(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

/** helper function to get log lines and replace milliseconds with static value. */
function getLogLines(calls: Array<Array<unknown>>) {
  return calls.map(log => {
    let msg: string;
    if (typeof log[1] === 'string') {
      msg = maskRequestId(
        log[1]
          // Replace milliseconds with static value
          .replace(/\(\d{1,4}ms\)/, '(666ms)')
          // Replace stack trace line numbers with static value
          .replace(/\(node:net:\d+:\d+\)/, '(node:net:666:666)')
          .replace(/\(node:dns:\d+:\d+\)/, '(node:dns:666:666)'),
        // request UUIDsu
      );
    } else {
      msg = String(log[1]);
    }

    return '[' + log[0] + ']' + ' ' + msg;
  });
}

export function createHiveTestingLogger() {
  let fn = vi.fn();
  return {
    error: (message: unknown) => fn('ERR', message),
    info: (message: unknown) => fn('INF', message),
    getLogs() {
      return getLogLines(fn.mock.calls).join('\n');
    },
    clear() {
      fn = vi.fn();
    },
  };
}

export function maskRequestId(errorMessage: string) {
  return errorMessage.replace(
    /[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}/,
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  );
}

export function fastFetchError(input: URL | RequestInfo, _init?: RequestInit) {
  let url: URL;
  if (typeof input === 'string') {
    url = new URL(input);
  } else if (input instanceof URL) {
    url = input;
  } else {
    url = new URL(input.url);
  }
  const hostname = url.hostname;
  const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as Error & { [k: string]: string };
  error.code = 'ENOTFOUND';
  error.errno = 'ENOTFOUND';
  error.syscall = 'getaddrinfo';
  error.hostname = hostname;
  error.stack = undefined; // prevent stack details from messing up snapshots
  return Promise.reject(error);
}
