import { once } from 'node:events';
import { createServer, get as httpGet, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  captureException,
  getIsolationScope,
  setUser,
  withIsolationScope,
  withScope,
  type Event,
} from '@sentry/node';
import { sentryInit } from './sentry';

const events: Event[] = [];
let client: NonNullable<ReturnType<typeof sentryInit>>;

beforeAll(() => {
  // A closed local port: the transport fails with ECONNREFUSED right away, with no DNS lookup.
  const initialized = sentryInit({
    dist: 'test',
    enabled: true,
    dsn: 'https://public@127.0.0.1:9/1',
    release: 'test-release',
  });
  if (!initialized) {
    throw new Error('Sentry client was not created');
  }
  client = initialized;
  client.on('beforeSendEvent', event => {
    events.push(event);
  });
});

afterEach(() => {
  events.length = 0;
});

async function capturedEvent(): Promise<Event> {
  await vi.waitFor(() => expect(events).toHaveLength(1));
  return events[0];
}

describe('sentryInit', () => {
  test('configures error capture only, with no tracing, loader hooks or request data', () => {
    const options = client.getOptions();

    expect(options).toMatchObject({
      dist: 'test',
      release: 'test-release',
      defaultIntegrations: false,
      attachStacktrace: false,
      enableRuntimeChannelInjection: false,
    });
    expect(options.tracesSampleRate).toBeUndefined();
    expect(options.tracesSampler).toBeUndefined();
    expect(options.enableOpenTelemetrySetup).toBeFalsy();
    expect(options.dataCollection).toMatchObject({ userInfo: false, httpBodies: [] });
    expect(client.getIntegrationByName('Http')).toBeDefined();
  });

  test('sends user data set explicitly on the scope even with user info collection off', async () => {
    withScope(scope => {
      scope.setUser({ id: 'u1', ip_address: '1.2.3.4' });
      captureException(new Error('boom'));
    });

    const event = await capturedEvent();
    expect(event.user).toMatchObject({ id: 'u1', ip_address: '1.2.3.4' });
    expect(event.dist).toBe('test');
  });

  test('keeps scope data apart between concurrent isolation scopes', async () => {
    await Promise.all(
      ['first', 'second'].map(id =>
        withIsolationScope(async () => {
          setUser({ id });
          // Let the other callback run while this scope is live.
          await new Promise(resolve => setTimeout(resolve, 5));
          captureException(new Error(`boom ${id}`));
        }),
      ),
    );

    await vi.waitFor(() => expect(events).toHaveLength(2));
    const userByMessage = Object.fromEntries(
      events.map(event => [event.exception?.values?.[0]?.value, event.user?.id]),
    );
    expect(userByMessage).toEqual({ 'boom first': 'first', 'boom second': 'second' });
  });

  test('scrubs basic auth credentials out of exception messages', async () => {
    captureException(new Error('request to https://user:secret@example.com/path failed'));

    const event = await capturedEvent();
    expect(event.exception?.values?.[0]?.value).toBe(
      'request to https://[Filtered]:[Filtered]@example.com/path failed',
    );
  });

  test('records outgoing http breadcrumbs without injecting trace headers', async () => {
    const seenHeaders: IncomingHttpHeaders[] = [];
    const server = createServer((req, res) => {
      seenHeaders.push(req.headers);
      res.end('ok');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ping`;

    try {
      await new Promise<void>((resolve, reject) => {
        httpGet(url, res => {
          res.resume();
          res.on('end', resolve);
        }).on('error', reject);
      });
      // The breadcrumb lands on the isolation scope once Node reports the response finished.
      await vi.waitFor(() =>
        expect(JSON.stringify(getIsolationScope().getScopeData().breadcrumbs)).toContain(url),
      );

      captureException(new Error('after request'));
      const event = await capturedEvent();

      expect(event.breadcrumbs?.some(b => b.category === 'http')).toBe(true);
      expect(JSON.stringify(event.breadcrumbs)).toContain(url);
      expect(seenHeaders).toHaveLength(1);
      expect(seenHeaders[0]).not.toHaveProperty('sentry-trace');
      expect(seenHeaders[0]).not.toHaveProperty('baggage');
    } finally {
      server.close();
    }
  });
});
