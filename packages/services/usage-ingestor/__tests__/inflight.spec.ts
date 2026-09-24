import { createInflightTracker } from '../src/inflight';
import { committedOffsetLag, errors } from '../src/metrics';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildLogger() {
  return {
    warn: vi.fn(),
    debug: vi.fn(),
  } as any;
}

function buildTracker(overrides: Partial<Parameters<typeof createInflightTracker>[0]> = {}) {
  const onCommit = vi.fn().mockResolvedValue(undefined);
  const tracker = createInflightTracker({
    maxBytes: 100,
    commitIntervalMs: 1000,
    onCommit,
    logger: buildLogger(),
    ...overrides,
  });
  return { tracker, onCommit };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('commits only up to the contiguous acknowledged prefix, as last offset + 1', async () => {
  const { tracker, onCommit } = buildTracker();
  const a = deferred();
  const b = deferred();
  const c = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '10', bytes: 1, promise: a.promise });
  tracker.track({ topic: 't', partition: 0, offset: '11', bytes: 1, promise: b.promise });
  tracker.track({ topic: 't', partition: 0, offset: '12', bytes: 1, promise: c.promise });

  b.resolve();
  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).not.toHaveBeenCalled();

  a.resolve();
  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenLastCalledWith([{ topic: 't', partition: 0, offset: '12' }]);

  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(1);

  c.resolve();
  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(2);
  expect(onCommit).toHaveBeenLastCalledWith([{ topic: 't', partition: 0, offset: '13' }]);
});

test('partitions advance independently', async () => {
  const { tracker, onCommit } = buildTracker();
  const stuck = deferred();
  const done = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '5', bytes: 1, promise: stuck.promise });
  tracker.track({ topic: 't', partition: 1, offset: '7', bytes: 1, promise: done.promise });

  done.resolve();
  await vi.advanceTimersByTimeAsync(1000);

  expect(onCommit).toHaveBeenCalledWith([{ topic: 't', partition: 1, offset: '8' }]);
});

test('a rejected write never advances the commit offset', async () => {
  const { tracker, onCommit } = buildTracker();
  const failed = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '5', bytes: 1, promise: failed.promise });

  failed.reject(new Error('aborted'));
  await vi.advanceTimersByTimeAsync(1000);

  expect(onCommit).not.toHaveBeenCalled();
  expect(tracker.inflight()).toEqual({ bytes: 0, count: 0 });
});

test('a failed commit is counted and retried on the next interval', async () => {
  const onCommit = vi
    .fn()
    .mockRejectedValueOnce(new Error('rebalance in progress'))
    .mockResolvedValue(undefined);
  const { tracker } = buildTracker({ onCommit });
  const errorsSpy = vi.spyOn(errors, 'inc');
  const a = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '1', bytes: 1, promise: a.promise });
  a.resolve();

  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(errorsSpy).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(2);
  expect(onCommit).toHaveBeenLastCalledWith([{ topic: 't', partition: 0, offset: '2' }]);

  await vi.advanceTimersByTimeAsync(1000);
  expect(onCommit).toHaveBeenCalledTimes(2);

  errorsSpy.mockRestore();
});

test('waitForCapacity blocks at the byte cap, heartbeats while waiting, and resumes after a settle', async () => {
  const { tracker } = buildTracker({ maxBytes: 10, heartbeatIntervalMs: 100 });
  const heartbeat = vi.fn().mockResolvedValue(undefined);
  const big = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '1', bytes: 8, promise: big.promise });

  let released = false;
  const waiting = tracker.waitForCapacity(5, heartbeat).then(() => {
    released = true;
  });

  await vi.advanceTimersByTimeAsync(350);
  expect(released).toBe(false);
  expect(heartbeat).toHaveBeenCalledTimes(3);

  big.resolve();
  await vi.advanceTimersByTimeAsync(0);
  await waiting;
  expect(released).toBe(true);

  await vi.advanceTimersByTimeAsync(500);
  expect(heartbeat).toHaveBeenCalledTimes(3);
});

test('waitForCapacity lets a message through when nothing is in flight, even if it exceeds the cap', async () => {
  const { tracker } = buildTracker({ maxBytes: 10 });
  const heartbeat = vi.fn().mockResolvedValue(undefined);

  await expect(tracker.waitForCapacity(50, heartbeat)).resolves.toBeUndefined();
  expect(heartbeat).not.toHaveBeenCalled();
});

test('drain commits acknowledged work and gives up on the rest at the deadline', async () => {
  const { tracker, onCommit } = buildTracker();
  const acked = deferred();
  const stuck = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '1', bytes: 1, promise: acked.promise });
  tracker.track({ topic: 't', partition: 1, offset: '9', bytes: 1, promise: stuck.promise });
  acked.resolve();
  await vi.advanceTimersByTimeAsync(0);

  const draining = tracker.drain(500);
  await vi.advanceTimersByTimeAsync(500);
  const result = await draining;

  expect(result).toEqual({ remaining: 1 });
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith([{ topic: 't', partition: 0, offset: '2' }]);
});

test('reports committed lag as high watermark minus the next offset to commit', async () => {
  const { tracker } = buildTracker();
  const setSpy = vi.spyOn(committedOffsetLag, 'set');
  const a = deferred();
  tracker.track({ topic: 't', partition: 3, offset: '10', bytes: 1, promise: a.promise });

  tracker.observeHighWatermark('t', 3, '20');
  expect(setSpy).not.toHaveBeenCalled();

  a.resolve();
  await vi.advanceTimersByTimeAsync(0);
  expect(setSpy).toHaveBeenLastCalledWith({ partition: '3' }, 9);

  tracker.observeHighWatermark('t', 3, '25');
  expect(setSpy).toHaveBeenLastCalledWith({ partition: '3' }, 14);

  setSpy.mockRestore();
});

test('retainPartitions drops state and the gauge for revoked partitions', async () => {
  const { tracker, onCommit } = buildTracker();
  const removeSpy = vi.spyOn(committedOffsetLag, 'remove');
  const a = deferred();
  tracker.track({ topic: 't', partition: 0, offset: '10', bytes: 1, promise: a.promise });
  tracker.track({ topic: 't', partition: 1, offset: '10', bytes: 1, promise: a.promise });

  tracker.retainPartitions({ t: [1] });
  a.resolve();
  await vi.advanceTimersByTimeAsync(1000);

  expect(removeSpy).toHaveBeenCalledWith({ partition: '0' });
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith([{ topic: 't', partition: 1, offset: '11' }]);

  removeSpy.mockRestore();
});
