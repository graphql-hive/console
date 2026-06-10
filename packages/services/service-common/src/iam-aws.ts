import { setTimeout as sleep } from 'node:timers/promises';
import { Sha256 } from '@aws-crypto/sha256-js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { formatUrl } from '@aws-sdk/util-format-url';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';

/**
 * Generic AWS IAM utilities for SigV4 pre-signed token generation.
 */

/**
 * Max TTL for SigV4 pre-signed tokens in seconds (15 minutes).
 */
const SIGV4_TOKEN_TTL_SECONDS = 900;

/**
 * Configuration for generating a SigV4 pre-signed token.
 */
export interface PresignedTokenConfig {
  /** AWS service name used in the SigV4 signing scope (e.g. `'elasticache'`). */
  service: string;
  /** AWS region used in the SigV4 signing scope (e.g. `'us-east-1'`). */
  region: string;
  /** Hostname embedded in the presigned request (typically the cluster/broker endpoint). */
  hostname: string;
  /** Query parameters appended to the presigned URL (e.g. `{ Action: 'connect', User: 'default' }`). */
  query: Record<string, string>;
}

/**
 * Generate a SigV4 pre-signed token for any AWS service.
 *
 * Builds a synthetic HTTP GET request, signs it with SigV4 using the default
 * credential chain ({@link fromNodeProviderChain}), and returns the signed URL
 * with the protocol prefix stripped. The resulting token is never sent as an
 * HTTP request. It is passed as a credential to the target service.
 *
 * @param config - Service, region, hostname, and query parameters for the presigned request.
 * @returns The signed URL string with the `http(s)://` prefix removed.
 */
export async function generatePresignedToken(config: PresignedTokenConfig): Promise<string> {
  const credentialProvider = fromNodeProviderChain();
  const expiresIn = SIGV4_TOKEN_TTL_SECONDS;

  const request = new HttpRequest({
    protocol: 'http:',
    hostname: config.hostname,
    method: 'GET',
    path: '/',
    query: config.query,
    headers: {
      Host: config.hostname,
    },
  });

  const signer = new SignatureV4({
    service: config.service,
    region: config.region,
    credentials: credentialProvider,
    sha256: Sha256,
  });

  const signed = await signer.presign(request, { expiresIn });
  // formatUrl encodes query values exactly once (important for X-Amz-Security-Token).
  const token = formatUrl(signed).replace(/^https?:\/\//, '');

  return token;
}

/**
 * Options for {@link startTokenRefreshTimer}.
 *
 * Controls the refresh interval, jitter, and retry behaviour
 * for periodic credential rotation.
 */
export interface TokenRefreshTimerOptions {
  /** Seconds to subtract from the 15-min SigV4 max TTL to derive the refresh interval (default: 60 -> 14 min refresh). */
  backoffRefreshSeconds?: number;
  /** Max random jitter in ms added to interval (default: 30_000 = 30 seconds). */
  jitterMs?: number;
  /** Max retry attempts on failure (default: 3). */
  maxRetries?: number;
  /** Base backoff delay in ms, multiplied by attempt number (default: 5_000 = 5 seconds). */
  retryBackoffMs?: number;
}

/**
 * Start a periodic timer that calls `refreshFn` to rotate credentials.
 *
 * The interval is derived from `SIGV4_TOKEN_TTL_SECONDS` minus a configurable
 * backoff (default 60 s -> ~14-minute cycle). Random jitter (0-30 s) is added
 * to prevent thundering-herd refreshes across instances.
 *
 * On failure the timer retries up to `maxRetries`
 * times with linear backoff (`attempt * retryBackoffMs`). Callers that need
 * per-attempt error logging should catch inside `refreshFn`, which receives
 * the current `attempt` and `maxRetries` as arguments.
 *
 * @param refreshFn - Async function that generates a new token and applies it
 *   to the target client (e.g. Redis AUTH). Receives the
 *   current `attempt` (1-based) and `maxRetries` for logging/alerting.
 * @param options - Tuning knobs for interval, jitter, and retry behaviour.
 * @returns A cleanup function that stops the refresh loop and prevents in-flight
 *   retries from executing (e.g. during graceful shutdown). Safe to call multiple times.
 */
export function startTokenRefreshTimer(
  refreshFn: (attempt: number, maxRetries: number) => Promise<void>,
  options?: TokenRefreshTimerOptions,
): () => void {
  const backoff = options?.backoffRefreshSeconds ?? 60;
  const intervalMs = (SIGV4_TOKEN_TTL_SECONDS - backoff) * 1000;
  const maxJitterMs = options?.jitterMs ?? 30_000;
  const maxRetries = options?.maxRetries ?? 3;
  const retryBackoffMs = options?.retryBackoffMs ?? 5_000;

  // Track shutdown state to prevent in-flight callbacks and retries during graceful shutdown
  const abortController = new AbortController();
  let currentTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleNext() {
    if (abortController.signal.aborted) return;
    const jitterMs = Math.floor(Math.random() * maxJitterMs);

    currentTimer = setTimeout(() => {
      if (abortController.signal.aborted) return;

      void (async () => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (abortController.signal.aborted) return;

          try {
            await refreshFn(attempt, maxRetries);
            break;
          } catch {
            if (attempt >= maxRetries) {
              return;
            }
          }

          try {
            await sleep(attempt * retryBackoffMs, {
              signal: abortController.signal,
            });
          } catch (err) {
            if (abortController.signal.aborted) {
              return;
            }
            throw err;
          }
        }
        // Schedule next cycle only after current refresh (including retries) completes
        scheduleNext();
      })();
    }, intervalMs + jitterMs);
  }

  scheduleNext();

  // Return a cleanup function that sets shutdown flag and clears the pending timer
  return () => {
    abortController.abort();
    if (currentTimer !== undefined) {
      clearTimeout(currentTimer);
    }
  };
}
