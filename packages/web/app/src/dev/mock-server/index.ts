import { setTimeout as sleep } from 'node:timers/promises';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isObjectType, parse, type DocumentNode } from 'graphql';
import { z } from 'zod';
import { decodePins, encodePins, isPinKey, parsePinAssignment, type Pins } from '@/dev/pins';
import { DEFAULT_SCENARIO, scenarios } from '@/dev/scenarios';
import { createMockEngine, type MockEngine } from './engine';
import { collectPinnableFields } from './page-fields';
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
export const PINS_COOKIE = 'hive-mock-pins';

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
  /** Replaces the whole pin set; null clears it. */
  pins: z.record(z.unknown()).nullish(),
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

  // Which operations each page sends, keyed by the page path the request came from (the
  // Referer, which follows SPA navigation). Backs the switcher's "fields on this page".
  const pageOperations = new Map<string, Map<string, DocumentNode>>();
  const recordOperation = (req: FastifyRequest, name: string, query: string) => {
    const referer = req.headers.referer;
    if (!referer) return;
    let path: string;
    try {
      path = new URL(referer).pathname;
    } catch {
      return;
    }
    let operations = pageOperations.get(path);
    if (!operations) pageOperations.set(path, (operations = new Map()));
    if (!operations.has(name)) {
      try {
        operations.set(name, parse(query));
      } catch {
        // The engine reports the parse error to the client; nothing to record.
      }
    }
  };

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

  // A pin must name a real field, or the mock layer would carry it silently forever.
  const isSchemaField = (key: string) => {
    const [typeName, fieldName] = key.split('.');
    const type = baseSchema.getType(typeName);
    return isObjectType(type) && fieldName in type.getFields();
  };
  const validPins = (pins: Pins): Pins =>
    Object.fromEntries(Object.entries(pins).filter(([key]) => isPinKey(key) && isSchemaField(key)));
  const pinsOf = (req: FastifyRequest) => validPins(decodePins(readControl(req, PINS_COOKIE)));

  // One engine per scenario and pin set: pins are mock rules, so they need their own store.
  const engineFor = (name: string, pins: Pins) => {
    const sorted = Object.fromEntries(Object.entries(pins).sort(([a], [b]) => a.localeCompare(b)));
    const key = `${name}|${JSON.stringify(sorted)}`;
    let engine = engines.get(key);
    if (!engine) {
      const scenario = scenarios[name];
      engine = createMockEngine(baseSchema, {
        ...scenario,
        fields: { ...scenario.fields, ...sorted },
      });
      engines.set(key, engine);
    }
    return engine;
  };

  const pinsCookie = (pins: Pins) =>
    Object.keys(pins).length > 0
      ? setControl(PINS_COOKIE, encodePins(pins))
      : clearControl(PINS_COOKIE);

  // HTML navigations: ?scenario= / ?latency= / ?error= / ?pin= become cookies (an empty
  // value clears one), then the session is planted, or cleared for a scenario without one.
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
    // ?pin=Type.field:value adds to the current pins, repeatable; a bare ?pin= clears them.
    const pinParams = url.searchParams.getAll('pin');
    if (pinParams.length > 0) {
      const next = pinParams.includes('') ? {} : { ...pinsOf(req) };
      for (const assignment of pinParams) {
        const parsed = parsePinAssignment(assignment);
        if (parsed && isSchemaField(parsed[0])) next[parsed[0]] = parsed[1];
      }
      cookies.push(pinsCookie(next));
    }
    if (cookies.length > 0) {
      for (const key of ['scenario', 'latency', 'error', 'pin']) url.searchParams.delete(key);
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
    const pins = pinsOf(req);
    recordOperation(req, operationName || 'anonymous', body.data.query);
    req.log.info({ operationName, scenario: name, pins: Object.keys(pins) }, 'mock graphql');
    // Always 200 with no auth-shaped extensions.code, or the client's authExchange signs out.
    return reply.status(200).send(await engineFor(name, pins).execute(body.data));
  });

  server.get('/__mock/scenarios', (req, reply) =>
    reply.send({
      active: scenarioNameOf(req),
      default: defaultScenario,
      controls: {
        latency: latencyOf(req),
        error: readControl(req, ERROR_COOKIE) ?? null,
        pins: pinsOf(req),
      },
      scenarios: Object.values(scenarios).map(({ name, description }) => ({ name, description })),
    }),
  );

  // The pinnable fields a page selects, from the operations recorded for its path.
  server.get('/__mock/fields', (req, reply) => {
    const path = (req.query as { path?: string }).path;
    if (!path) return reply.status(400).send({ error: 'path is required' });
    const operations = pageOperations.get(path);
    return reply.send({
      path,
      operations: operations ? [...operations.keys()] : [],
      fields: operations ? collectPinnableFields(baseSchema, [...operations.values()]) : [],
    });
  });

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
    if ('pins' in parsed.data) {
      const pins = validPins(parsed.data.pins ?? {});
      const rejected = Object.keys(parsed.data.pins ?? {}).filter(key => !(key in pins));
      if (rejected.length > 0) {
        return reply.status(400).send({ error: 'unknown fields', rejected });
      }
      cookies.push(pinsCookie(pins));
    }
    return reply.header('set-cookie', cookies).send({ ok: true });
  });

  server.post('/__mock/reset', (req, reply) => {
    for (const key of engines.keys()) {
      if (key.startsWith(`${scenarioNameOf(req)}|`)) engines.delete(key);
    }
    return reply
      .header('set-cookie', [
        clearControl(LATENCY_COOKIE),
        clearControl(ERROR_COOKIE),
        clearControl(PINS_COOKIE),
      ])
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
