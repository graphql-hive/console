import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('generatePresignedToken', () => {
  const mockFormatUrl = vi.fn();
  const mockPresign = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockFormatUrl.mockReset();
    mockPresign.mockReset();

    // Mock all AWS SDK dynamic imports
    vi.doMock('@aws-sdk/credential-providers', () => ({
      fromNodeProviderChain: vi.fn(() => 'mock-credential-provider'),
    }));
    vi.doMock('@smithy/protocol-http', () => {
      const MockHttpRequest = vi.fn(function (this: any, opts: any) {
        Object.assign(this, opts);
      });
      return { HttpRequest: MockHttpRequest };
    });
    vi.doMock('@smithy/signature-v4', () => {
      const MockSignatureV4 = vi.fn(function (this: any) {
        this.presign = mockPresign;
      });
      return { SignatureV4: MockSignatureV4 };
    });
    vi.doMock('@aws-crypto/sha256-js', () => ({
      Sha256: vi.fn(),
    }));
    vi.doMock('@aws-sdk/util-format-url', () => ({
      formatUrl: mockFormatUrl,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('token output', () => {
    it('strips http:// so the token is a bare host+query string', async () => {
      mockPresign.mockResolvedValue({});
      mockFormatUrl.mockReturnValue(
        'http://test-host/?Action=connect&User=default&X-Amz-Signature=abc123',
      );

      const { generatePresignedToken } = await import('./iam-aws');

      const token = await generatePresignedToken({
        service: 'elasticache',
        region: 'us-east-1',
        hostname: 'my-cache',
        query: { Action: 'connect', User: 'default' },
      });

      expect(token).toBe('test-host/?Action=connect&User=default&X-Amz-Signature=abc123');
    });

    it('strips https:// the same way', async () => {
      mockPresign.mockResolvedValue({});
      mockFormatUrl.mockReturnValue('https://my-cache/?signed=true');

      const { generatePresignedToken } = await import('./iam-aws');

      const token = await generatePresignedToken({
        service: 'elasticache',
        region: 'us-east-1',
        hostname: 'my-cache',
        query: {},
      });

      expect(token).toBe('my-cache/?signed=true');
    });
  });

  describe('SigV4 request construction', () => {
    it('builds an HttpRequest from the caller hostname and query', async () => {
      const { HttpRequest } = await import('@smithy/protocol-http');
      mockPresign.mockResolvedValue({});
      mockFormatUrl.mockReturnValue('http://x');

      const { generatePresignedToken } = await import('./iam-aws');

      await generatePresignedToken({
        service: 'elasticache',
        region: 'us-east-1',
        hostname: 'my-cache-group',
        query: { Action: 'connect', User: 'myuser' },
      });

      expect(HttpRequest).toHaveBeenCalledWith({
        protocol: 'http:',
        hostname: 'my-cache-group',
        method: 'GET',
        path: '/',
        query: { Action: 'connect', User: 'myuser' },
        headers: { Host: 'my-cache-group' },
      });
    });

    it('uses the caller service and region for the signer', async () => {
      const { SignatureV4 } = await import('@smithy/signature-v4');
      const { Sha256 } = await import('@aws-crypto/sha256-js');
      mockPresign.mockResolvedValue({});
      mockFormatUrl.mockReturnValue('http://x');

      const { generatePresignedToken } = await import('./iam-aws');

      await generatePresignedToken({
        service: 'kafka',
        region: 'eu-west-1',
        hostname: 'broker',
        query: {},
      });

      expect(SignatureV4).toHaveBeenCalledWith({
        service: 'kafka',
        region: 'eu-west-1',
        credentials: 'mock-credential-provider',
        sha256: Sha256,
      });
    });

    it('presigns with a 900s expiry', async () => {
      mockPresign.mockResolvedValue({});
      mockFormatUrl.mockReturnValue('http://x');

      const { generatePresignedToken } = await import('./iam-aws');

      await generatePresignedToken({
        service: 'elasticache',
        region: 'us-east-1',
        hostname: 'my-cache',
        query: {},
      });

      expect(mockPresign).toHaveBeenCalledWith(expect.anything(), { expiresIn: 900 });
    });
  });

  describe('error propagation', () => {
    it('rejects when presign fails (e.g. expired credentials)', async () => {
      mockPresign.mockRejectedValue(new Error('Token has expired'));

      const { generatePresignedToken } = await import('./iam-aws');

      await expect(
        generatePresignedToken({
          service: 'elasticache',
          region: 'us-east-1',
          hostname: 'my-cache',
          query: {},
        }),
      ).rejects.toThrow('Token has expired');
    });

    it('rejects when the credential provider fails (no credentials available)', async () => {
      vi.doMock('@aws-sdk/credential-providers', () => ({
        fromNodeProviderChain: vi.fn(() => {
          throw new Error('Could not load credentials from any providers');
        }),
      }));

      const { generatePresignedToken } = await import('./iam-aws');

      await expect(
        generatePresignedToken({
          service: 'elasticache',
          region: 'us-east-1',
          hostname: 'my-cache',
          query: {},
        }),
      ).rejects.toThrow('Could not load credentials from any providers');
    });
  });
});

describe('startTokenRefreshTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    // Deterministic jitter: Math.random() → 0
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // Mock node:timers/promises so sleep uses the faked global setTimeout
    vi.doMock('node:timers/promises', () => ({
      setTimeout: (ms: number, _value?: unknown, options?: { signal?: AbortSignal }) =>
        new Promise<void>((resolve, reject) => {
          const id = globalThis.setTimeout(resolve, ms);
          options?.signal?.addEventListener('abort', () => {
            globalThis.clearTimeout(id);
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('scheduling', () => {
    it('does not call unref — abort controller handles shutdown instead', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('refreshes after (TOKEN_TTL - backoff) seconds, then schedules next', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      // (900 - 60) * 1000 = 840_000ms
      expect(refreshFn).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('accepts a larger backoff to shorten the refresh cycle', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 180,
        jitterMs: 0,
      });

      // (900 - 180) * 1000 = 720_000ms
      await vi.advanceTimersByTimeAsync(720_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('defaults to 60s backoff when no options are provided', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn);

      // (900 - 60) * 1000 = 840_000ms, jitter = 0 (mocked Math.random)
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('stops when the cleanup function is called', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      cleanup();

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('cannot overlap — next cycle waits for current refresh to complete', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');

      let resolveRefresh: () => void;
      const refreshFn = vi.fn(() => new Promise<void>(resolve => (resolveRefresh = resolve)));

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      // Trigger first cycle — refreshFn blocks
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // Advance another full interval while first refresh is still in-flight
      await vi.advanceTimersByTimeAsync(840_000);
      // No second call — recursive setTimeout means next is not yet scheduled
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // Complete the first refresh — this should schedule the next timeout
      resolveRefresh!();
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      // Now advance the interval again — second refresh fires
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(2);

      cleanup();
    });
  });

  describe('error handling', () => {
    it('retries up to maxRetries, passing attempt info to refreshFn', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockRejectedValue(new Error('STS timeout'));

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
        retryBackoffMs: 100,
      });

      // Trigger the interval
      await vi.advanceTimersByTimeAsync(840_000);
      // Allow retry backoff timers to fire (attempt 1: 100ms, attempt 2: 200ms)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      expect(refreshFn).toHaveBeenCalledTimes(3);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);
      expect(refreshFn).toHaveBeenCalledWith(2, 3);
      expect(refreshFn).toHaveBeenCalledWith(3, 3);

      cleanup();
    });

    it('schedules the next cycle after all retries are exhausted', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockRejectedValue(new Error('always fails'));

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 2,
        retryBackoffMs: 100,
      });

      // First cycle: trigger + exhaust retries
      await vi.advanceTimersByTimeAsync(840_000);
      await vi.advanceTimersByTimeAsync(100); // retry backoff for attempt 1
      expect(refreshFn).toHaveBeenCalledTimes(2);

      // Second cycle: timer should fire again after intervalMs
      refreshFn.mockClear();
      await vi.advanceTimersByTimeAsync(840_000);
      await vi.advanceTimersByTimeAsync(100);
      expect(refreshFn).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('does not retry when refreshFn succeeds on the first attempt', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
      });

      await vi.advanceTimersByTimeAsync(840_000);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);

      cleanup();
    });

    it('stops retrying after the first successful attempt', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient failure'))
        .mockResolvedValueOnce(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
        retryBackoffMs: 100,
      });

      await vi.advanceTimersByTimeAsync(840_000);
      // Allow first retry backoff (attempt 1: 100ms)
      await vi.advanceTimersByTimeAsync(100);

      expect(refreshFn).toHaveBeenCalledTimes(2);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);
      expect(refreshFn).toHaveBeenCalledWith(2, 3);

      cleanup();
    });
  });

  describe('shutdown safety', () => {
    it('prevents new callbacks from executing after cleanup is called', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      // First refresh should execute
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      // Call cleanup
      cleanup();

      // Second refresh should not execute
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it('stops retries when cleanup is called during in-flight refresh', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockRejectedValue(new Error('fail'));
      let cleanupFn: () => void;

      // Call cleanup after the first attempt
      refreshFn.mockImplementationOnce(async () => {
        cleanupFn();
        throw new Error('fail');
      });

      cleanupFn = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 5,
        retryBackoffMs: 100,
      });

      await vi.advanceTimersByTimeAsync(840_000);
      await vi.advanceTimersByTimeAsync(10_000);

      // Should stop after the first attempt since cleanup was called
      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it('allows cleanup to be called multiple times safely', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      cleanup();
      cleanup();
      cleanup();

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('returns a callable cleanup function from the start', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const cleanup = startTokenRefreshTimer(refreshFn);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });
});
