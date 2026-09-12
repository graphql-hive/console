import Fastify, { type FastifyInstance } from 'fastify';
import { connectMockServer, ERROR_COOKIE, LATENCY_COOKIE, SCENARIO_COOKIE } from './index';
import { createFrontToken, FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE } from './session';

const HTML = '<html><head></head><body></body></html>';
const asBrowser = { accept: 'text/html,application/xhtml+xml' };
const RUN = 'run1';

/** A control cookie as the browser would send it back for this run. */
const ctl = (name: string, value: string, run = RUN) => `${name}=${run}.${value}`;
/** The Set-Cookie header the server writes for a control. */
const setCtl = (name: string, value: string) => `${name}=${RUN}.${value}; Path=/; SameSite=Lax`;

const setCookies = (res: { headers: Record<string, unknown> }) => {
  const raw = res.headers['set-cookie'];
  return (Array.isArray(raw) ? raw : raw ? [String(raw)] : []) as string[];
};
const cookieNames = (res: { headers: Record<string, unknown> }) =>
  setCookies(res).map(c => c.split('=')[0]);

async function graphql(
  server: FastifyInstance,
  query: string,
  extra: { cookie?: string; operationName?: string; variables?: unknown } = {},
) {
  return server.inject({
    method: 'POST',
    url: '/graphql',
    headers: extra.cookie ? { cookie: extra.cookie } : {},
    payload: { query, operationName: extra.operationName, variables: extra.variables },
  });
}

async function startServer(options: Parameters<typeof connectMockServer>[1] = {}) {
  const server = Fastify({ logger: false });
  await connectMockServer(server, { session: RUN, ...options });
  // Registered after the mock, like the real GET * in src/server/index.ts.
  server.get('*', (_req, reply) => reply.type('text/html').send(HTML));
  await server.ready();
  return server;
}

const QUOTA_QUERY =
  'query { organizationBySlug(organizationSlug: "acme") { isMonthlyOperationsLimitExceeded } }';
const quotaExceeded = (res: { json(): any }) =>
  res.json().data.organizationBySlug.isMonthlyOperationsLimitExceeded as boolean;

describe('connectMockServer', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(() => server.close());

  describe('POST /graphql', () => {
    test('answers with mock data and never an auth-shaped error', async () => {
      const res = await graphql(server, 'query { me { id email } }');

      expect(res.statusCode).toBe(200);
      expect(res.json().data.me.email).toBe('user@the-guild.dev');
      expect(res.json().errors).toBeUndefined();
    });

    test('rejects a malformed body with 400, never 401', async () => {
      const res = await server.inject({ method: 'POST', url: '/graphql', payload: { nope: 1 } });

      expect(res.statusCode).toBe(400);
      expect(res.json().errors[0].message).toMatch(/invalid/i);
    });

    test('serves the scenario named by the cookie', async () => {
      const plain = await graphql(server, QUOTA_QUERY);
      const quota = await graphql(server, QUOTA_QUERY, {
        cookie: ctl(SCENARIO_COOKIE, 'over-quota'),
      });

      expect(quotaExceeded(plain)).toBe(false);
      expect(quotaExceeded(quota)).toBe(true);
    });

    test('ignores a scenario cookie stamped by a previous run', async () => {
      const res = await graphql(server, QUOTA_QUERY, {
        cookie: ctl(SCENARIO_COOKIE, 'over-quota', 'old-run'),
      });

      expect(quotaExceeded(res)).toBe(false);
    });

    test('an unknown scenario cookie falls back to the default', async () => {
      const res = await graphql(server, 'query { me { id } }', {
        cookie: ctl(SCENARIO_COOKIE, 'does-not-exist'),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.me.id).toBe('mock-user');
    });

    test('delays by the latency cookie', async () => {
      const started = Date.now();
      await graphql(server, 'query { me { id } }', { cookie: ctl(LATENCY_COOKIE, '200') });

      expect(Date.now() - started).toBeGreaterThanOrEqual(190);
    });

    test('forces an unexpected error only for the named operation', async () => {
      const cookie = ctl(ERROR_COOKIE, 'Target|unexpected');
      const hit = await graphql(server, 'query Target { me { id } }', {
        cookie,
        operationName: 'Target',
      });
      const miss = await graphql(server, 'query Other { me { id } }', {
        cookie,
        operationName: 'Other',
      });

      expect(hit.statusCode).toBe(200);
      expect(hit.json().errors[0].message).toContain('Unexpected error');
      expect(hit.json().errors[0].extensions?.code).toBeUndefined();
      expect(miss.json().data.me.id).toBe('mock-user');
    });

    test('forces a network error as a non-JSON 503', async () => {
      const res = await graphql(server, 'query Q { me { id } }', {
        cookie: ctl(ERROR_COOKIE, '*|network'),
        operationName: 'Q',
      });

      expect(res.statusCode).toBe(503);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(() => res.json()).toThrow();
    });

    test('forces a plain graphql error for every operation with *', async () => {
      const res = await graphql(server, 'query Q { me { id } }', {
        cookie: ctl(ERROR_COOKIE, '*|graphql'),
        operationName: 'Q',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().errors).toHaveLength(1);
      expect(res.json().errors[0].extensions?.code).toBeUndefined();
    });
  });

  describe('startup defaults', () => {
    test("a chosen scenario applies with no cookie and beats a previous run's cookie", async () => {
      const chosen = await startServer({ defaultScenario: 'over-quota' });
      try {
        const bare = await graphql(chosen, QUOTA_QUERY);
        const stale = await graphql(chosen, QUOTA_QUERY, {
          cookie: ctl(SCENARIO_COOKIE, 'default', 'old-run'),
        });
        const switched = await graphql(chosen, QUOTA_QUERY, {
          cookie: ctl(SCENARIO_COOKIE, 'default'),
        });

        expect(quotaExceeded(bare)).toBe(true);
        expect(quotaExceeded(stale)).toBe(true);
        expect(quotaExceeded(switched)).toBe(false);
      } finally {
        await chosen.close();
      }
    });

    test('an unknown chosen scenario falls back to default', async () => {
      const chosen = await startServer({ defaultScenario: 'nope' });
      try {
        expect(
          (await chosen.inject({ method: 'GET', url: '/__mock/scenarios' })).json().default,
        ).toBe('default');
      } finally {
        await chosen.close();
      }
    });

    test('a chosen latency applies until a cookie overrides it', async () => {
      const slow = await startServer({ defaultLatency: 200 });
      try {
        const started = Date.now();
        await graphql(slow, 'query { me { id } }');
        expect(Date.now() - started).toBeGreaterThanOrEqual(190);

        const quick = Date.now();
        await graphql(slow, 'query { me { id } }', { cookie: ctl(LATENCY_COOKIE, '0') });
        expect(Date.now() - quick).toBeLessThan(150);
      } finally {
        await slow.close();
      }
    });
  });

  describe('HTML navigations', () => {
    test('plant the session and mark the page as mock mode', async () => {
      const res = await server.inject({ method: 'GET', url: '/acme', headers: asBrowser });

      expect(res.statusCode).toBe(200);
      expect(cookieNames(res)).toEqual([FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE]);
      expect(res.body).toContain('window.__HIVE_MOCK__ = true');
    });

    test('leave a valid mock session alone', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/acme',
        headers: { ...asBrowser, cookie: `${FRONT_TOKEN_COOKIE}=${createFrontToken()}` },
      });

      expect(setCookies(res)).toEqual([]);
    });

    test('replace a token left by a real-stack login, which the SDK could not refresh here', async () => {
      const real = Buffer.from(
        JSON.stringify({ uid: 'someone-else', ate: Date.now() - 1, up: {} }),
      ).toString('base64');
      const res = await server.inject({
        method: 'GET',
        url: '/acme',
        headers: { ...asBrowser, cookie: `${FRONT_TOKEN_COOKIE}=${real}` },
      });

      expect(cookieNames(res)).toEqual([FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE]);
      expect(setCookies(res)[0]).not.toContain(real);
    });

    test('clear the session for a scenario without one', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/auth',
        headers: {
          ...asBrowser,
          cookie: `${ctl(SCENARIO_COOKIE, 'logged-out')}; ${FRONT_TOKEN_COOKIE}=abc`,
        },
      });

      expect(cookieNames(res)).toEqual([FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE]);
      for (const cookie of setCookies(res)) expect(cookie).toContain('Max-Age=0');
    });

    test('turn ?scenario= into a run-stamped cookie and redirect without it', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/acme/api?scenario=over-quota&keep=1',
        headers: asBrowser,
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/acme/api?keep=1');
      expect(setCookies(res)).toEqual([setCtl(SCENARIO_COOKIE, 'over-quota')]);
    });

    test('an empty ?scenario= clears the cookie, back to the startup default', async () => {
      const res = await server.inject({ method: 'GET', url: '/?scenario=', headers: asBrowser });

      expect(res.statusCode).toBe(302);
      expect(setCookies(res)[0]).toMatch(new RegExp(`^${SCENARIO_COOKIE}=; .*Max-Age=0`));
    });

    test('turn ?latency= and ?error= into cookies, and empty values clear them', async () => {
      const set = await server.inject({
        method: 'GET',
        url: '/?latency=500&error=Q|graphql',
        headers: asBrowser,
      });
      const clear = await server.inject({
        method: 'GET',
        url: '/?latency=0&error=',
        headers: asBrowser,
      });

      expect(setCookies(set)).toEqual([
        setCtl(LATENCY_COOKIE, '500'),
        setCtl(ERROR_COOKIE, 'Q|graphql'),
      ]);
      for (const cookie of setCookies(clear)) expect(cookie).toContain('Max-Age=0');
    });

    test('ignore an unknown scenario name', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/?scenario=nope',
        headers: asBrowser,
      });

      expect(res.statusCode).toBe(200);
      expect(cookieNames(res)).toEqual([FRONT_TOKEN_COOKIE, LAST_UPDATE_COOKIE]);
    });

    test('do not plant cookies on non-HTML requests', async () => {
      const res = await server.inject({ method: 'GET', url: '/assets/x.js' });

      expect(setCookies(res)).toEqual([]);
    });

    test('only inject the mock marker into HTML responses', async () => {
      const res = await server.inject({ method: 'GET', url: '/__mock/scenarios' });

      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).not.toContain('__HIVE_MOCK__');
    });
  });

  describe('/__mock', () => {
    test('lists scenarios with the active one, the default, and current controls', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/__mock/scenarios',
        headers: {
          cookie: `${ctl(SCENARIO_COOKIE, 'empty-org')}; ${ctl(LATENCY_COOKIE, '250')}`,
        },
      });
      const body = res.json();

      expect(body.active).toBe('empty-org');
      expect(body.default).toBe('default');
      expect(body.controls).toEqual({ latency: 250, error: null });
      expect(body.scenarios.map((s: any) => s.name)).toContain('outdated-schema');
    });

    test('sets the scenario cookie, clears it for null, and rejects unknown names', async () => {
      const post = (name: string | null) =>
        server.inject({ method: 'POST', url: '/__mock/scenario', payload: { name } });
      const ok = await post('over-quota');
      const back = await post(null);
      const bad = await post('nope');

      expect(ok.statusCode).toBe(200);
      expect(setCookies(ok)).toEqual([setCtl(SCENARIO_COOKIE, 'over-quota')]);
      expect(setCookies(back)[0]).toContain('Max-Age=0');
      expect(bad.statusCode).toBe(404);
    });

    test('sets and clears controls', async () => {
      const set = await server.inject({
        method: 'POST',
        url: '/__mock/controls',
        payload: { latency: 300, error: 'Q|network' },
      });
      const clear = await server.inject({
        method: 'POST',
        url: '/__mock/controls',
        payload: { latency: null, error: null },
      });

      expect(setCookies(set)).toEqual([
        setCtl(LATENCY_COOKIE, '300'),
        setCtl(ERROR_COOKIE, 'Q|network'),
      ]);
      for (const cookie of setCookies(clear)) expect(cookie).toContain('Max-Age=0');
    });

    test('reset clears the controls', async () => {
      const res = await server.inject({ method: 'POST', url: '/__mock/reset' });

      expect(res.json()).toEqual({ ok: true });
      expect(cookieNames(res)).toEqual([LATENCY_COOKIE, ERROR_COOKIE]);
    });
  });

  test('POST /auth-api/signout succeeds so /logout completes', async () => {
    const res = await server.inject({ method: 'POST', url: '/auth-api/signout' });

    expect(res.json()).toEqual({ status: 'OK' });
  });
});
