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
    // Deterministic jitter: Math.random() → 0
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('interval scheduling', () => {
    it('refreshes every (TOKEN_TTL - backoff) seconds', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      // (900 - 60) * 1000 = 840_000ms
      expect(refreshFn).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(2);

      clearInterval(timer);
    });

    it('accepts a larger backoff to shorten the refresh cycle', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 180,
        jitterMs: 0,
      });

      // (900 - 180) * 1000 = 720_000ms
      await vi.advanceTimersByTimeAsync(720_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      clearInterval(timer);
    });

    it('defaults to 60s backoff when no options are provided', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const timer = startTokenRefreshTimer(refreshFn);

      // (900 - 60) * 1000 = 840_000ms, jitter = 0 (mocked Math.random)
      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).toHaveBeenCalledTimes(1);

      clearInterval(timer);
    });

    it('stops when the returned handle is cleared', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
      });

      clearInterval(timer);

      await vi.advanceTimersByTimeAsync(840_000);
      expect(refreshFn).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('retries up to maxRetries, passing attempt info to refreshFn', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockRejectedValue(new Error('STS timeout'));

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
        retryBackoffMs: 100,
      });

      // Trigger the interval
      await vi.advanceTimersByTimeAsync(840_000);
      // Allow retry backoff timers to fire
      await vi.advanceTimersByTimeAsync(1000);

      expect(refreshFn).toHaveBeenCalledTimes(3);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);
      expect(refreshFn).toHaveBeenCalledWith(2, 3);
      expect(refreshFn).toHaveBeenCalledWith(3, 3);

      clearInterval(timer);
    });

    it('does not retry when refreshFn succeeds on the first attempt', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi.fn().mockResolvedValue(undefined);

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
      });

      await vi.advanceTimersByTimeAsync(840_000);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);

      clearInterval(timer);
    });

    it('stops retrying after the first successful attempt', async () => {
      const { startTokenRefreshTimer } = await import('./iam-aws');
      const refreshFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient failure'))
        .mockResolvedValueOnce(undefined);

      const timer = startTokenRefreshTimer(refreshFn, {
        backoffRefreshSeconds: 60,
        jitterMs: 0,
        maxRetries: 3,
        retryBackoffMs: 100,
      });

      await vi.advanceTimersByTimeAsync(840_000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(refreshFn).toHaveBeenCalledTimes(2);
      expect(refreshFn).toHaveBeenCalledWith(1, 3);
      expect(refreshFn).toHaveBeenCalledWith(2, 3);

      clearInterval(timer);
    });
  });
});
