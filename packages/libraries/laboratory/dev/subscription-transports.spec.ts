import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { createMockYoga } from './mock-graphql';
import { attachSubscriptionTransports } from './subscription-transports';

const OIDC_LOG = /* GraphQL */ `
  subscription OidcLog {
    oidcIntegrationLog(input: { oidcIntegrationId: "dev" }) {
      message
    }
  }
`;

type Message = { type: string; id?: string; payload?: Record<string, any> };

/** Collects socket messages and lets a test await the one it cares about. */
class Inbox {
  readonly messages: Message[] = [];
  private waiters: Array<() => void> = [];

  constructor(socket: WebSocket) {
    socket.on('message', raw => {
      this.messages.push(JSON.parse(String(raw)) as Message);
      this.waiters.splice(0).forEach(notify => notify());
    });
  }

  async waitFor(predicate: (message: Message) => boolean) {
    while (!this.messages.some(predicate)) {
      await new Promise<void>(resolve => this.waiters.push(resolve));
    }

    return this.messages.find(predicate)!;
  }

  ofType(type: string) {
    return this.messages.filter(message => message.type === type);
  }
}

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

const startServer = async (subscriptions = { eventCount: 3, intervalMs: 0 }) => {
  const yoga = createMockYoga({ subscriptions });
  const httpServer = createServer(yoga);
  const transports = attachSubscriptionTransports({ httpServer, yoga, path: '/graphql' });

  await new Promise<void>(resolve => httpServer.listen(0, resolve));

  cleanups.push(async () => {
    await transports.dispose();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  const { port } = httpServer.address() as AddressInfo;

  return `ws://localhost:${port}/graphql`;
};

const connect = async (url: string, protocol: string) => {
  const socket = new WebSocket(url, protocol);
  const inbox = new Inbox(socket);

  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  cleanups.push(() => socket.close());

  return { socket, inbox };
};

const send = (socket: WebSocket, message: Message) => socket.send(JSON.stringify(message));

describe('legacy ws transport', () => {
  it('acknowledges the connection, streams data, then completes', async () => {
    const url = await startServer();
    const { socket, inbox } = await connect(url, 'graphql-ws');

    send(socket, { type: 'connection_init' });
    await inbox.waitFor(message => message.type === 'connection_ack');

    send(socket, { type: 'start', id: '1', payload: { query: OIDC_LOG } });
    await inbox.waitFor(message => message.type === 'complete');

    const data = inbox.ofType('data');
    const messages = data.map(event => event.payload?.data.oidcIntegrationLog.message);

    expect(data).toHaveLength(3);
    expect(new Set(messages).size).toBe(3);
    expect(data.every(event => event.id === '1')).toBe(true);
  });

  it('stops a running subscription on request', async () => {
    // Slow enough that the stop lands mid-stream rather than after it finished.
    const url = await startServer({ eventCount: 50, intervalMs: 50 });
    const { socket, inbox } = await connect(url, 'graphql-ws');

    send(socket, { type: 'connection_init' });
    await inbox.waitFor(message => message.type === 'connection_ack');

    send(socket, { type: 'start', id: '1', payload: { query: OIDC_LOG } });
    await inbox.waitFor(message => message.type === 'data');

    send(socket, { type: 'stop', id: '1' });
    await inbox.waitFor(message => message.type === 'complete');

    const afterComplete = inbox.messages.slice(
      inbox.messages.findIndex(message => message.type === 'complete') + 1,
    );

    expect(inbox.ofType('data').length).toBeLessThan(50);
    expect(afterComplete.filter(message => message.type === 'data')).toHaveLength(0);
  });

  it('reports validation errors instead of streaming', async () => {
    const url = await startServer();
    const { socket, inbox } = await connect(url, 'graphql-ws');

    send(socket, { type: 'connection_init' });
    await inbox.waitFor(message => message.type === 'connection_ack');

    send(socket, { type: 'start', id: '1', payload: { query: 'subscription { nope }' } });
    const error = await inbox.waitFor(message => message.type === 'error');

    expect(error.id).toBe('1');
    expect(inbox.ofType('data')).toHaveLength(0);
  });
});

describe('graphql-ws transport', () => {
  // Thin, but it covers our envelope bridge (onSubscribe plus the rootValue
  // execute/subscribe pair), which is the part graphql-ws does not provide.
  it('streams through the enveloped subscribe', async () => {
    const url = await startServer();
    const client = createClient({ url, webSocketImpl: WebSocket, retryAttempts: 0 });
    cleanups.push(() => client.dispose());

    const received: string[] = [];

    for await (const result of client.iterate<{
      oidcIntegrationLog: { message: string };
    }>({ query: OIDC_LOG })) {
      received.push(result.data!.oidcIntegrationLog.message);
    }

    expect(received).toHaveLength(3);
    expect(new Set(received).size).toBe(3);
  });
});

describe('upgrade dispatch', () => {
  it('serves both subscription protocols on the same path', async () => {
    const url = await startServer();

    const modern = await connect(url, 'graphql-transport-ws');
    const legacy = await connect(url, 'graphql-ws');

    expect(modern.socket.protocol).toBe('graphql-transport-ws');
    expect(legacy.socket.protocol).toBe('graphql-ws');
  });

  it('rejects an upgrade offering neither protocol', async () => {
    const url = await startServer();
    const socket = new WebSocket(url, 'chat');

    await expect(
      new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      }),
    ).rejects.toThrow();
  });
});
