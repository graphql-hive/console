import 'reflect-metadata';
import { describe, expect, test, vi } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { retryOnCheckRunNotFound } from './github-integration-manager';

function githubError(status: number) {
  return new RequestError(status === 404 ? 'Not Found' : 'Forbidden', status, {
    request: {
      method: 'PATCH',
      url: 'https://api.github.com/repos/owner/repo/check-runs/1',
      headers: {},
    },
  });
}

describe('retryOnCheckRunNotFound', () => {
  test('retries a 404 and returns the later success', async () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn().mockRejectedValueOnce(githubError(404)).mockResolvedValueOnce('ok');
      const onRetry = vi.fn();

      const promise = retryOnCheckRunNotFound(run, onRetry, [10, 20]);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('ok');
      expect(run).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, 10);
    } finally {
      vi.useRealTimers();
    }
  });

  test('gives up after the last wait and rethrows the 404', async () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn().mockRejectedValue(githubError(404));
      const onRetry = vi.fn();

      const promise = retryOnCheckRunNotFound(run, onRetry, [10, 20]);
      promise.catch(() => undefined);
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toMatchObject({ status: 404 });
      expect(run).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenLastCalledWith(2, 20);
    } finally {
      vi.useRealTimers();
    }
  });

  test('does not retry other GitHub errors', async () => {
    const run = vi.fn().mockRejectedValue(githubError(403));
    const onRetry = vi.fn();

    await expect(retryOnCheckRunNotFound(run, onRetry, [10])).rejects.toMatchObject({
      status: 403,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  test('does not retry non-GitHub errors', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    const onRetry = vi.fn();

    await expect(retryOnCheckRunNotFound(run, onRetry, [10])).rejects.toThrow('boom');
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
