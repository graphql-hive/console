import { createMockYoga } from './mock-graphql';

/**
 * Frames are parsed rather than snapshotted: schema.graphql is regenerated regularly,
 * so a whole-body snapshot would rot on changes that have nothing to do with the mock.
 */
const parseFrames = (body: string) => {
  const frames = body
    .split('\n\n')
    .map(frame => frame.trim())
    .filter(Boolean);

  const events = frames
    .filter(frame => frame.startsWith('event: next'))
    .map(frame => {
      const data = frame
        .split('\n')
        .find(line => line.startsWith('data:'))!
        .slice('data:'.length);

      return JSON.parse(data) as {
        data: Record<string, Record<string, string>>;
        extensions?: Record<string, unknown>;
      };
    });

  return { events, completed: frames.some(frame => frame.startsWith('event: complete')) };
};

const runSubscription = async (query: string, headers: Record<string, string> = {}) => {
  // intervalMs 0 keeps the whole stream inside one await; the generator still ends on
  // its own, which is what lets us read the body to completion.
  const yoga = createMockYoga({ subscriptions: { eventCount: 3, intervalMs: 0 } });
  const url = new URL('http://localhost/graphql');
  url.searchParams.set('query', query);

  const response = await yoga.fetch(url, {
    method: 'GET',
    headers: { accept: 'text/event-stream', ...headers },
  });

  return { response, ...parseFrames(await response.text()) };
};

const OIDC_LOG = /* GraphQL */ `
  subscription OidcLog {
    oidcIntegrationLog(input: { oidcIntegrationId: "dev" }) {
      message
      timestamp
    }
  }
`;

describe('mock subscriptions', () => {
  it('streams over SSE and completes', async () => {
    const { response, events, completed } = await runSubscription(OIDC_LOG);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(events).toHaveLength(3);
    expect(completed).toBe(true);
  });

  it('gives each event a distinct payload', async () => {
    const { events } = await runSubscription(OIDC_LOG);
    const messages = events.map(event => event.data.oidcIntegrationLog.message);
    const timestamps = events.map(event =>
      Date.parse(event.data.oidcIntegrationLog.timestamp as string),
    );

    expect(new Set(messages).size).toBe(messages.length);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(timestamps.every(Number.isFinite)).toBe(true);
  });

  // queryPlanPlugin hooks onExecute, which envelop does not run for subscription
  // events. Asserted so the gap is documented rather than rediscovered.
  it('does not attach a query plan to subscription events', async () => {
    const { events } = await runSubscription(OIDC_LOG, { 'x-query-plan': 'simple' });

    expect(events.every(event => event.extensions?.queryPlan === undefined)).toBe(true);
  });
});

describe('mock queries', () => {
  it('still resolves generated values', async () => {
    const yoga = createMockYoga();

    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ me { id displayName } }' }),
    });

    await expect(response.json()).resolves.toMatchObject({
      data: { me: { id: 'mock-id', displayName: 'displayName value' } },
    });
  });
});
