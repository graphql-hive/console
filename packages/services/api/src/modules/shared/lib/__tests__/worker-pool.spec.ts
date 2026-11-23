import { fileURLToPath } from 'node:url';
import { NoopLogger } from '../../providers/logger';
import { WorkerPool } from '../worker-pool';

type Task =
  | { kind: 'echo'; value: string }
  | { kind: 'sleep'; value: string; ms: number }
  | { kind: 'hang' }
  | { kind: 'fail'; message: string }
  | { kind: 'crash' };

const pools: Array<WorkerPool<Task, string>> = [];

function createPool(options: { size?: number; timeoutMs?: number } = {}) {
  const pool = new WorkerPool<Task, string>({
    name: 'test',
    scriptPath: fileURLToPath(new URL('./worker-pool.fixture.mjs', import.meta.url)),
    size: options.size ?? 1,
    maxOldGenerationSizeMb: 64,
    timeoutMs: options.timeoutMs ?? 5_000,
    logger: new NoopLogger(),
  });
  pools.push(pool);
  return pool;
}

afterEach(async () => {
  await Promise.all(pools.splice(0).map(pool => pool.close()));
});

test('runs a task in a worker', async () => {
  const pool = createPool();
  await expect(pool.run({ kind: 'echo', value: 'hi' })).resolves.toBe('hi');
});

test('queues tasks until a worker is idle', async () => {
  const pool = createPool({ size: 1 });
  const results = await Promise.all([
    pool.run({ kind: 'sleep', value: 'a', ms: 50 }),
    pool.run({ kind: 'echo', value: 'b' }),
    pool.run({ kind: 'echo', value: 'c' }),
  ]);
  expect(results).toEqual(['a', 'b', 'c']);
});

test('a task error rejects the task and keeps the worker', async () => {
  const pool = createPool();
  await expect(pool.run({ kind: 'fail', message: 'nope' })).rejects.toThrow('nope');
  await expect(pool.run({ kind: 'echo', value: 'still alive' })).resolves.toBe('still alive');
});

test('a crashed worker is replaced', async () => {
  const pool = createPool();
  await expect(pool.run({ kind: 'crash' })).rejects.toThrow('crashed');
  await expect(pool.run({ kind: 'echo', value: 'replaced' })).resolves.toBe('replaced');
});

test('a blocked worker is replaced after the timeout', async () => {
  const pool = createPool({ timeoutMs: 200 });
  const hanging = pool.run({ kind: 'hang' });
  const queued = pool.run({ kind: 'echo', value: 'after timeout' });
  await expect(hanging).rejects.toThrow(/Timeout/);
  await expect(queued).resolves.toBe('after timeout');
});

test('pending tasks are rejected on close', async () => {
  const pool = createPool();
  const running = expect(pool.run({ kind: 'sleep', value: 'a', ms: 1_000 })).rejects.toThrow(
    /closed/,
  );
  const queued = expect(pool.run({ kind: 'echo', value: 'b' })).rejects.toThrow(/closed/);
  await pool.close();
  await running;
  await queued;
  await expect(pool.run({ kind: 'echo', value: 'c' })).rejects.toThrow(/closed/);
});
