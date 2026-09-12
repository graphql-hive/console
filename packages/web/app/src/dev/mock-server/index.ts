import { setTimeout as sleep } from 'node:timers/promises';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DEFAULT_SCENARIO, scenarios } from '@/dev/scenarios';
import { createMockEngine, type MockEngine } from './engine';
import { loadHiveSchema } from './schema';
import {
  expiredSessionCookies,
  FRONT_TOKEN_COOKIE,
  isMockFrontToken,
  readCookie,
  sessionCookies,
} from './session';

export const SCENARIO_COOKIE = 'hive-mock-scenario';
export const LATENCY_COOKIE = 'hive-mock-latency';
export const ERROR_COOKIE = 'hive-mock-error';

export const ERROR_KINDS = ['graphql', 'network', 'unexpected'] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];

export type MockServerOptions = {
  /**
   * Identifies this run. Control cookies are stamped with it, so a cookie left in the
   * browser by a previous run is ignored and the scenario chosen at startup wins.
   */
  session?: string;
  /** Scenario served when no (current-run) cookie says otherwise. */
  defaultScenario?: string;
  /** Latency applied when no (current-run) cookie says otherwise. */
  defaultLatency?: number;
};

const COOKIE_ATTRS = 'Path=/; SameSite=Lax';

const GraphQLBody = z.object({
  query: z.string(),
  variables: z.record(z.unknown()).nullish(),
  operationName: z.string().nullish(),
  extensions: z.unknown().optional(),
});

const ControlsBody = z.object({
  latency: z.number().int().min(0).nullish(),
  error: z.string().nullish(),
});

/** "<operationName>|<kind>", operationName may be "*". */
function parseErrorControl(raw: string | undefined): { operation: string; kind: ErrorKind } | null {
  if (!raw) return null;
  const [operation, kind] = raw.split('|');
  if (!operation || !ERROR_KINDS.includes(kind as ErrorKind)) return null;
  return { operation, kind: kind as ErrorKind };
}

function parseLatencyControl(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function connectMockServer(server: FastifyInstance, options: MockServerOptions = {}) {
  const session = options.session ?? Date.now().toString(36);
  const defaultScenario =
    options.defaultScenario && options.defaultScenario in scenarios
      ? options.defaultScenario
      : DEFAULT_SCENARIO;
  const defaultLatency = options.defaultLatency ?? 0;

  const baseSchema = await loadHiveSchema();
  const engines = new Map<string, MockEngine>();

  // Control cookies carry "<session>.<value>"; a value from another run reads as absent.
  const setControl = (name: string, value: string) =>
    `${name}=${session}.${value}; ${COOKIE_ATTRS}`;
  const clearControl = (name: string) => `${name}=; ${COOKIE_ATTRS}; Max-Age=0`;
  const readControl = (req: FastifyRequest, name: string): string | undefined => {
    const raw = readCookie(req.headers.cookie, name);
    return raw?.startsWith(`${session}.`) ? raw.slice(session.length + 1) : undefined;
  };

  const scenarioNameOf = (req: FastifyRequest) => {
    const name = readControl(req, SCENARIO_COOKIE);
    return name && name in scenarios ? name : defaultScenario;
  };
  const latencyOf = (req: FastifyRequest) => {
    const raw = readControl(req, LATENCY_COOKIE);
    return raw === undefined ? defaultLatency : parseLatencyControl(raw);
  };
  const engineFor = (name: string) => {
    let engine = engines.get(name);
    if (!engine) {
      engine = createMockEngine(baseSchema, scenarios[name]);
      engines.set(name, engine);
    }
    return engine;
  };

  // HTML navigations: ?scenario= / ?latency= / ?error= become cookies (an empty value
  // clears one), then the session is planted, or cleared for a scenario without one.
  server.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'GET' || !(req.headers.accept ?? '').includes('text/html')) return;

    const url = new URL(req.url, 'http://localhost');
    const cookies: string[] = [];
    const scenario = url.searchParams.get('scenario');
    if (scenario !== null) {
      if (scenario === '') cookies.push(clearControl(SCENARIO_COOKIE));
      else if (scenario in scenarios) cookies.push(setControl(SCENARIO_COOKIE, scenario));
    }
    const latency = url.searchParams.get('latency');
    if (latency !== null) {
      cookies.push(
        parseLatencyControl(latency)
          ? setControl(LATENCY_COOKIE, latency)
          : clearControl(LATENCY_COOKIE),
      );
    }
    const error = url.searchParams.get('error');
    if (error !== null) {
      cookies.push(
        parseErrorControl(error) ? setControl(ERROR_COOKIE, error) : clearControl(ERROR_COOKIE),
      );
    }
    if (cookies.length > 0) {
      for (const key of ['scenario', 'latency', 'error']) url.searchParams.delete(key);
      return reply.header('set-cookie', cookies).redirect(url.pathname + url.search);
    }

    const frontToken = readCookie(req.headers.cookie, FRONT_TOKEN_COOKIE);
    if (scenarios[scenarioNameOf(req)].session === false) {
      if (frontToken !== undefined) void reply.header('set-cookie', expiredSessionCookies());
    } else if (!isMockFrontToken(frontToken)) {
      // Missing, expired, or left behind by a real-stack login on this origin.
      void reply.header('set-cookie', sessionCookies());
    }
  });

  // Marks the page so the client can mount the mock switcher. Only ever true in mock mode.
  server.addHook('onSend', async (_req, reply, payload) => {
    const contentType = String(reply.getHeader('content-type') ?? '');
    if (typeof payload !== 'string' || !contentType.includes('text/html')) return payload;
    return payload.replace('<head>', '<head><script>window.__HIVE_MOCK__ = true;</script>');
  });

  server.post('/graphql', async (req, reply) => {
    const body = GraphQLBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ errors: [{ message: 'Invalid GraphQL request body' }] });
    }

    const latency = latencyOf(req);
    if (latency > 0) await sleep(latency);

    const forced = parseErrorControl(readControl(req, ERROR_COOKIE));
    const operationName = body.data.operationName ?? '';
    if (forced && (forced.operation === '*' || forced.operation === operationName)) {
      return sendForcedError(reply, forced.kind);
    }

    const name = scenarioNameOf(req);
    req.log.info({ operationName, scenario: name }, 'mock graphql');
    // Always 200 with no auth-shaped extensions.code, or the client's authExchange signs out.
    return reply.status(200).send(await engineFor(name).execute(body.data));
  });

  server.get('/__mock/scenarios', (req, reply) =>
    reply.send({
      active: scenarioNameOf(req),
      default: defaultScenario,
      controls: {
        latency: latencyOf(req),
        error: readControl(req, ERROR_COOKIE) ?? null,
      },
      scenarios: Object.values(scenarios).map(({ name, description }) => ({ name, description })),
    }),
  );

  // { name: null } goes back to the startup default.
  server.post('/__mock/scenario', (req, reply) => {
    const parsed = z.object({ name: z.string().nullable() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid body' });
    if (parsed.data.name === null) {
      return reply.header('set-cookie', clearControl(SCENARIO_COOKIE)).send({ ok: true });
    }
    if (!(parsed.data.name in scenarios)) {
      return reply.status(404).send({ error: 'unknown scenario' });
    }
    return reply
      .header('set-cookie', setControl(SCENARIO_COOKIE, parsed.data.name))
      .send({ ok: true });
  });

  server.post('/__mock/controls', (req, reply) => {
    const parsed = ControlsBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid controls' });
    const cookies: string[] = [];
    if ('latency' in parsed.data) {
      cookies.push(
        parsed.data.latency
          ? setControl(LATENCY_COOKIE, String(parsed.data.latency))
          : clearControl(LATENCY_COOKIE),
      );
    }
    if ('error' in parsed.data) {
      const valid = parsed.data.error && parseErrorControl(parsed.data.error);
      cookies.push(
        valid ? setControl(ERROR_COOKIE, parsed.data.error!) : clearControl(ERROR_COOKIE),
      );
    }
    return reply.header('set-cookie', cookies).send({ ok: true });
  });

  server.post('/__mock/reset', (req, reply) => {
    engines.delete(scenarioNameOf(req));
    return reply
      .header('set-cookie', [clearControl(LATENCY_COOKIE), clearControl(ERROR_COOKIE)])
      .send({ ok: true });
  });

  // Lets /logout complete; the next HTML load re-plants the session.
  server.post('/auth-api/signout', (_req, reply) => reply.send({ status: 'OK' }));

  return { session, defaultScenario, defaultLatency };
}

function sendForcedError(reply: FastifyReply, kind: ErrorKind) {
  switch (kind) {
    case 'network':
      // A non-JSON 503 is what makes urql's fetchExchange produce a networkError.
      return reply.status(503).type('text/plain').send('Service Unavailable (forced by mock mode)');
    case 'unexpected':
      // Matches the message check in src/components/ui/query-error.tsx.
      return reply
        .status(200)
        .send({ errors: [{ message: 'Unexpected error (forced by mock mode)' }] });
    case 'graphql':
      return reply.status(200).send({ errors: [{ message: 'Forced by mock mode' }] });
  }
}
