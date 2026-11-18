import { setTimeout as setTimeoutP } from 'node:timers/promises';
import { Inject, Injectable } from 'graphql-modules';
import Redlock, { ExecutionError, Lock, ResourceLockedError } from 'redlock';
import { traceFn } from '@hive/service-common';
import { Logger } from './logger';
import type { Redis } from './redis';
import { REDIS_INSTANCE } from './redis';

export interface MutexLockOptions {
  signal: AbortSignal;
  /**
   * The lock duration in milliseconds. Beware that the duration
   * is how long is the lock held, not the acquire timeout.
   *
   * Note that the lock will be auto-extended by the duration all
   * the way until released (unlocked).
   *
   * @default 10_000
   */
  duration?: number;
  /**
   * How many times is the lock acquire retried before failing.
   *
   * @default 60
   */
  retries?: number;
  /**
   * How long to wait between lock acquire retries in milliseconds.
   *
   * The total lock timeout is then retries multiplied by the retryDelay.
   * For example: 60 (retries) * 1000ms (retryDelay) = 1min.
   *
   * @default 1000
   */
  retryDelay?: number;
  /**
   * How often the lock is extended in milliseconds.
   *
   * Extending early leaves a large safety margin before the lock expires,
   * so a blocked event loop or a slow Redis does not cause the lock to be lost.
   * A failed extension is retried until the lock actually expires.
   *
   * @default duration / 4
   */
  extendInterval?: number;
}

/** Error indicating that a resource is locked and the lock can not be acquired within the provided time frame. */
export class MutexResourceLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MutexResourceLockedError';
  }
}
/**
 * Perform an action under a mutex lock,ensuring that only one action is performed at a time for a given resource for
 * preventing race conditions and ensures data integrity by managing concurrent access to the locked resources.
 */
@Injectable()
export class Mutex {
  private logger: Logger;
  private redlock: Redlock;

  constructor(logger: Logger, @Inject(REDIS_INSTANCE) redis: Redis) {
    this.logger = logger.child({ service: 'Mutex' });
    this.redlock = new Redlock([redis]);
    this.redlock.on('error', err => {
      // these errors will be reported directly by the locking mechanism
      if (err instanceof ResourceLockedError) {
        return;
      }
      this.logger.error(err);
    });
  }

  @traceFn('Mutex.lock', {
    initAttributes: (id, options) => ({
      'lock.id': id,
      'lock.duration': options.duration,
      'lock.retries': options.retries,
      'lock.retryDelay': options.retryDelay,
      'lock.extendInterval': options.extendInterval,
    }),
    errorAttributes: error => ({
      'error.message': error.message,
    }),
  })
  async lock(
    id: string,
    {
      signal,
      duration = 10_000,
      retries = 30,
      retryDelay = 1_000,
      extendInterval = Math.floor(duration / 3),
    }: MutexLockOptions,
  ) {
    const { logger } = this;

    const requestAbortedD = Promise.withResolvers<never>();
    let attemptCounter = 0;
    let lockToAcquire: Lock | null = null;

    const onAbort = () => {
      logger.debug('Request has been aborted (id=%s)', id);
      requestAbortedD.reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      // We try to acquire the lock until the retry counter is exceeded or the lock as been successfully acquired.
      do {
        logger.debug('Acquiring lock (id=%s, attempt=%d)', id, attemptCounter + 1);

        // we avoid using any of the acquire settings for auto-extension, retrying, etc.
        // because of the many bugs and weird API design choices in the redlock library.
        // By manually handling the retries and lock extension we can abort acquiring the lock as soon as the incoming request has been canceled
        const acquireP = this.redlock
          .acquire([id], duration, {
            // we only want to try once to acquire the lock
            // if we fail, we will retry manually with our own logic
            retryCount: 0,
          })
          .catch((err: unknown) => {
            // Note: This is kind of a workaround.
            // The redlock library should not throw `ExecutionError`, but `ResourceLockedError`.
            // We have our own error here for the Mutex.
            // See https://github.com/mike-marcacci/node-redlock/issues/168
            if (
              err instanceof ExecutionError &&
              err.message ===
                'The operation was unable to achieve a quorum during its retry window.'
            ) {
              return null;
            }

            logger.error('Error while acquiring lock (id=%s)', id);
            console.error(err);
            throw err;
          });

        try {
          lockToAcquire = await Promise.race([acquireP, requestAbortedD.promise]);
        } catch (err) {
          if (signal.aborted) {
            // The in-flight acquire may still succeed after the abort.
            // Release that lock so it does not block other requests until it expires.
            void acquireP
              .then(orphanedLock => {
                if (orphanedLock) {
                  logger.debug('Releasing lock acquired after abort (id=%s)', id);
                  return orphanedLock.release();
                }
              })
              .catch(releaseErr => {
                logger.debug('Error while releasing lock acquired after abort (id=%s)', id);
                console.error(releaseErr);
              });
          }
          throw err;
        }

        if (lockToAcquire !== null) {
          break;
        }

        attemptCounter++;

        if (attemptCounter >= retries) {
          logger.debug('Acquiring lock failed (id=%s)', id);
          throw new MutexResourceLockedError(`Resource "${id}" is locked.`);
        }

        await Promise.race([requestAbortedD.promise, setTimeoutP(retryDelay)]);
        // eslint-disable-next-line no-constant-condition
      } while (true);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }

    let lock: Lock = lockToAcquire;

    logger.debug('Acquired lock (id=%s)', id);

    // If we acquired the lock but the request got canceled, we want to immediately release it,
    // so other pending requests can take over.
    if (signal.aborted) {
      logger.debug('Request has been aborted, release lock. (id=%s)', id);
      await lock.release().catch(err => {
        logger.debug('Error while releasing lock (id=%s)', id);
        console.error(err);
      });
      throw signal.reason;
    }

    /** How long to wait before retrying a failed lock extension. */
    const extendRetryDelay = Math.min(500, extendInterval);
    let released = false;
    let extendTimeout: NodeJS.Timeout | undefined;
    // we have a global timeout of 90 seconds to avoid dead-locks
    const globalTimeout = setTimeout(() => {
      logger.error('Global lock timeout exceeded (id=%s)', id);
      cleanup();
    }, 90_000);

    /** cleanup timers and release the lock. */
    function cleanup() {
      if (released) {
        return;
      }

      logger.debug('Releasing lock (id=%s)', id);
      released = true;
      clearTimeout(extendTimeout);
      clearTimeout(globalTimeout);

      void lock.release().catch(err => {
        logger.error('Error while releasing lock (id=%s)', id);
        console.error(err);
      });
    }

    function scheduleExtendLock(delay: number) {
      extendTimeout = setTimeout(() => void extendLock(), delay);
    }

    async function extendLock() {
      if (released) {
        return;
      }

      logger.debug('Attempt extending lock (id=%s)', id);
      try {
        // NOTE: extending a lock creates a new lock instance, so we need to replace it here.
        const extendedLock = await lock.extend(duration);
        if (released) {
          // The lock got released while the extension was in flight.
          // Release the extended lock as well, so it does not linger until it expires.
          void extendedLock.release().catch(() => {});
          return;
        }
        lock = extendedLock;
        logger.debug('Lock extension succeeded (id=%s)', id);
        scheduleExtendLock(extendInterval);
      } catch (err) {
        if (released) {
          return;
        }

        if (lock.expiration > Date.now()) {
          // The lock is still valid, so we can retry extending it.
          logger.warn('Failed to extend lock, retrying (id=%s)', id);
          console.error(err);
          scheduleExtendLock(extendRetryDelay);
          return;
        }

        logger.error('Failed to extend lock, the lock expired (id=%s)', id);
        console.error(err);
      }
    }

    logger.debug('Lock acquired (id=%s)', id);

    scheduleExtendLock(extendInterval);

    return cleanup;
  }

  public async perform<T>(
    id: string,
    opts: MutexLockOptions,
    action: () => T | Promise<T>,
  ): Promise<T> {
    const unlock = await this.lock(id, opts);
    try {
      return await action();
    } finally {
      await unlock();
    }
  }
}
