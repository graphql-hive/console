import pTimeout from 'p-timeout';

const atomicPromisesInFlight = new Map<string, Promise<any>>();

/**
 * This function is used to share execution across multiple calls of the same function.
 * It's useful when you have a function that can be called multiple times in a short period of time,
 * but you want to execute it only once.
 *
 * Once the execution is finished, the function will be available for the next call.
 *
 * @param fn - Function that should be executed only once per its execution period.
 * @returns Function that will execute the original function only once.
 */
export function atomic<R>(fn: () => Promise<R>): () => Promise<R> {
  // Generate a unique string for each call of `atomic` function to prevent collisions.
  const uniqueId = Math.random().toString(36).slice(2) + Date.now().toString(36);

  return function atomicWrapper() {
    const existing = atomicPromisesInFlight.get(uniqueId);
    if (existing) {
      return existing;
    }

    const promise = fn();
    atomicPromisesInFlight.set(uniqueId, promise);

    return promise.finally(() => {
      atomicPromisesInFlight.delete(uniqueId);
    });
  };
}

/**
 * It's used to track the number of requests that are in flight.
 * This is important because we don't want to kill the pod when
 * state mutating requests are in progress.
 */
export function useActionTracker() {
  let actionsInProgress = 0;

  function done() {
    --actionsInProgress;
  }

  function started() {
    ++actionsInProgress;
  }

  return {
    wrap<T, A>(fn: (arg: A) => Promise<T>) {
      return (arg: A) => {
        started();
        return fn(arg).finally(done);
      };
    },
    idle() {
      return actionsInProgress === 0;
    },
  };
}

/**
 * This function is used to wait until the condition is met or the timeout is reached.
 *
 * @param conditionFn - function to check the condition
 * @param timeout - timeout in milliseconds
 */
export function until(conditionFn: () => boolean, timeout: number): Promise<void> {
  return pTimeout(
    new Promise(resolve => {
      const interval = setInterval(() => {
        if (conditionFn()) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    }),
    {
      milliseconds: timeout,
    },
  );
}
