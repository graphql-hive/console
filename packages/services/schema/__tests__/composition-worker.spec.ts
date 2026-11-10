import { EventEmitter } from 'node:events';
import type { MessagePort } from 'node:worker_threads';
import type { Logger } from '../../api/src/modules/shared/providers/logger';
import {
  createCompositionWorker,
  type CompositionEvent,
  type CompositionResultEvent,
  type ErrorResultEvent,
} from '../src/composition-worker';
import type { env } from '../src/environment';

type PostedEvent = CompositionResultEvent | ErrorResultEvent;

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

const pending = new Map<string, (event: PostedEvent) => void>();
const port = new EventEmitter() as EventEmitter & { postMessage(event: PostedEvent): void };
port.postMessage = event => pending.get(event.id)?.(event);

createCompositionWorker({
  baseLogger: createLogger(),
  port: port as unknown as MessagePort,
  env: {
    encryptionSecret: 'secret',
    compositionWorker: { trackMemoryUsage: false },
    timings: { schemaExternalCompositionTimeout: 1_000 },
    transformExternalSupergraphToPublicSdl: false,
  } as typeof env,
});

function compose(data: CompositionEvent['data']) {
  const id = crypto.randomUUID();
  const result = new Promise<PostedEvent>(resolve => pending.set(id, resolve));
  port.emit('message', {
    event: 'composition',
    id,
    taskId: id,
    requestId: 'request',
    data,
  } satisfies CompositionEvent);
  return result;
}

const invalidSchema = { raw: 'iliketurtles', source: 'stub', url: null };

test.each<CompositionEvent['data']>([
  { type: 'single', args: { schemas: [invalidSchema] } },
  { type: 'stitching', args: { schemas: [invalidSchema] } },
  {
    type: 'federation',
    args: {
      schemas: [invalidSchema],
      external: null,
      native: true,
      contracts: undefined,
      requestId: 'request',
    },
  },
])('a syntax error in a submitted $type SDL is reported as a graphql error', async data => {
  await expect(compose(data)).resolves.toMatchObject({
    event: 'compositionResult',
    data: {
      type: data.type,
      result: {
        sdl: null,
        errors: [{ source: 'graphql', message: expect.stringMatching(/Syntax Error/) }],
      },
    },
  });
});
