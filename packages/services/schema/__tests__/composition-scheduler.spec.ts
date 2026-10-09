import { fileURLToPath } from 'node:url';
import type { Logger } from '../../api/src/modules/shared/providers/logger';
import { CompositionScheduler } from '../src/composition-scheduler';

const stubWorkerPath = fileURLToPath(
  new URL('./fixtures/composition-worker-stub.mjs', import.meta.url),
);

function createLogger(): Logger {
  const logger = {
    child: () => logger,
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  return logger as unknown as Logger;
}

let scheduler: CompositionScheduler;

function createScheduler(workerCount = 1) {
  scheduler = new CompositionScheduler(createLogger(), workerCount, 128, stubWorkerPath);
}

/** The stub worker interprets the first schema's `raw` field as a command. */
function run(command: string, abortSignal: AbortSignal = new AbortController().signal) {
  return scheduler.process({
    data: { type: 'single', args: { schemas: [{ raw: command, source: 'stub' }] } },
    requestId: 'request',
    abortSignal,
  });
}

afterEach(async () => {
  await scheduler.close();
});

test('recovers after a handled worker error', async ({ expect }) => {
  createScheduler();
  await expect(run('error')).rejects.toThrow('stub error');
  // Before the fix the slot kept a terminated worker and this task hung until the timeout.
  await expect(run('ok')).resolves.toMatchObject({ result: { sdl: 'ok' } });
});

test('recreates the worker when the thread exits', async ({ expect }) => {
  createScheduler();
  await expect(run('exit')).rejects.toThrow(/exited/);
  await expect(run('ok')).resolves.toMatchObject({ result: { sdl: 'ok' } });
});

test('recreates the worker on an uncaught exception', async ({ expect }) => {
  createScheduler();
  await expect(run('crash')).rejects.toThrow('stub crash');
  await expect(run('ok')).resolves.toMatchObject({ result: { sdl: 'ok' } });
});

test('abort mid-task recreates the worker and the next task succeeds', async ({ expect }) => {
  createScheduler();
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  await expect(run('hang', controller.signal)).rejects.toThrow('Task aborted');
  await expect(run('ok')).resolves.toMatchObject({ result: { sdl: 'ok' } });
});

test('queue keeps flowing under load', async ({ expect }) => {
  createScheduler(2);
  await expect(
    Promise.all(Array.from({ length: 6 }, () => run('sleep:20'))),
  ).resolves.toMatchObject(Array.from({ length: 6 }, () => ({ result: { sdl: 'ok' } })));
});
