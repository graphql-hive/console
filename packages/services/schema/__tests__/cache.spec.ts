import Redis from 'ioredis-mock';
import { createCache } from '../src/cache';

function randomString() {
  return Math.random().toString(36).substring(2);
}

function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('catch sync exception', async ({ expect }) => {
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 30,
    timeoutMs: 100,
    ttlMs: 100,
  });

  const run = cache.reuse(randomString(), () => {
    throw new Error('test');
  });

  await expect(run({})).rejects.toThrow('test');
});

test('catch async exception', async ({ expect }) => {
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 30,
    timeoutMs: 100,
    ttlMs: 100,
  });

  const run = cache.reuse(randomString(), async () => {
    throw new Error('test');
  });

  await expect(run({})).rejects.toThrow('test');
});

test('share execution', async ({ expect }) => {
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 30,
    timeoutMs: 100,
    ttlMs: 100,
  });

  const spy = vi.fn();

  const run = cache.reuse(randomString(), async () => {
    spy();
    await waitFor(50);
    return 'foo';
  });

  const run1 = run({});
  const run2 = run({});

  await expect(run1).resolves.toBe('foo');
  await expect(run2).resolves.toBe('foo');
  expect(spy).toHaveBeenCalledTimes(1);
});

test('cache the result of an action', async ({ expect }) => {
  const ttlMs = 100;
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 10,
    timeoutMs: 50,
    ttlMs,
  });

  const spy = vi.fn();

  const run = cache.reuse(randomString(), async () => {
    spy();
    return 'foo';
  });

  await expect(run({})).resolves.toBe('foo');
  await expect(run({})).resolves.toBe('foo');
  expect(spy).toHaveBeenCalledTimes(1);

  await waitFor(ttlMs / 2);

  await expect(run({})).resolves.toBe('foo');
  expect(spy).toHaveBeenCalledTimes(1);

  await waitFor(ttlMs);
  await expect(run({})).resolves.toBe('foo');
  expect(spy).toHaveBeenCalledTimes(2);
});

test('do not purge the cache when an action fails, persist the failure for some time', async ({
  expect,
}) => {
  const ttlMs = 50;
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 10,
    timeoutMs: 50,
    ttlMs,
  });

  const spy = vi.fn();
  let calls = 0;

  const run = cache.reuse(randomString(), async () => {
    spy();
    calls++;
    await waitFor(ttlMs / 2);

    if (calls >= 2) {
      // Fail the second time and after
      throw new Error('test');
    }

    return 'foo';
  });

  const run1 = run({});
  const run2 = run({});
  await expect(run1).resolves.toBe('foo');
  await expect(run2).resolves.toBe('foo');
  expect(spy).toHaveBeenCalledTimes(1);

  // Wait for the cache to expire
  await waitFor(ttlMs + 10);

  // Run it again
  await expect(run({})).rejects.toThrow('test');
  expect(spy).toHaveBeenCalledTimes(2);
  // Run it again, but this time it hits the cache (persisted failure)
  await expect(run({})).rejects.toThrow('test');
  expect(spy).toHaveBeenCalledTimes(2);

  // Wait for the cache to expire
  await waitFor(ttlMs + 10);
  // Run it again, but this time it calls the factory function
  await expect(run({})).rejects.toThrow('test');
  expect(spy).toHaveBeenCalledTimes(3);
});

test('timeout', async ({ expect }) => {
  const timeoutMs = 50;
  const ttlMs = 100;
  const cache = createCache({
    redis: new Redis(),
    logger: {
      debug: vi.fn() as any,
      warn: vi.fn() as any,
    },
    prefix: randomString(),
    pollIntervalMs: 10,
    timeoutMs,
    ttlMs,
  });

  const spy = vi.fn();
  const run = cache.reuse(randomString(), async () => {
    spy();
    await waitFor(timeoutMs * 2);
    return 'foo';
  });

  const run1 = run({});
  const run2 = run({});
  await expect(run1).rejects.toThrowError(/timeout/i);
  await expect(run2).rejects.toThrowError(/timeout/i);
  expect(spy).toHaveBeenCalledTimes(1);

  // Wait for the cache to expire
  await waitFor(ttlMs + 10);
  await expect(run({})).rejects.toThrowError(/timeout/i);
  expect(spy).toHaveBeenCalledTimes(2);
});
