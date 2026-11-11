import { ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import {
  AuditLogApiErrorModel,
  AuditLogEventsPageModel,
  type AuditLogEventsPage,
} from '@hive/api/modules/audit-logs/lib/audit-log-api-models';
import { clickHouseInsert } from '../../../testkit/clickhouse';

const baseUrl = await getServiceHost('server', 3001).then(r => `http://${r}/audit-log/v1`);

const HOUR = 60 * 60;

/** Encodes an arbitrary cursor payload, to test cursors the API would never hand out. */
function rawCursor(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/** Builds a cursor the way the API encodes them, to test cursors clients cannot obtain normally. */
function encodeAuditLogCursor(position: { timestamp: number; id: string }) {
  return Buffer.from(
    JSON.stringify({ v: 1, timestamp: position.timestamp, id: position.id }),
  ).toString('base64url');
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function toClickHouseDateTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function quote(value: string) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

type InsertedEvent = {
  id: string;
  timestamp: number;
  eventAction: string;
  userId?: string;
  userEmail?: string;
  accessTokenId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  /** Stored as-is instead of `metadata`, e.g. to simulate malformed rows. */
  rawMetadata?: string;
};

/** Writes audit log rows directly, so tests control timestamps (the API only returns settled rows). */
async function insertEvents(organizationId: string, events: InsertedEvent[]) {
  const values = events
    .map(event =>
      [
        quote(event.id),
        quote(toClickHouseDateTime(event.timestamp)),
        quote(organizationId),
        quote(event.eventAction),
        quote(event.userId ?? ''),
        quote(event.userEmail ?? ''),
        quote(event.accessTokenId ?? ''),
        quote(event.ipAddress ?? ''),
        quote(event.userAgent ?? ''),
        quote(event.rawMetadata ?? JSON.stringify(event.metadata ?? {})),
      ].join(', '),
    )
    .map(row => `(${row})`)
    .join(',\n');

  await clickHouseInsert(`
    INSERT INTO audit_logs (
      id, timestamp, organization_id, event_action, user_id, user_email,
      access_token_id, ip_address, user_agent, metadata
    ) VALUES ${values}
  `);
}

async function fetchEvents(params: Record<string, string>, token: string | null) {
  const url = new URL(baseUrl + '/events');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

/** Follows `nextCursor` until `hasMore` is false and returns every page. */
async function fetchAllPages(params: Record<string, string>, token: string) {
  const pages: Array<{ body: AuditLogEventsPage; link: string | null }> = [];
  let current = params;
  for (let i = 0; i < 100; i++) {
    const response = await fetchEvents(current, token);
    expect(response.status).toBe(200);
    const body = AuditLogEventsPageModel.parse(response.body);
    pages.push({ body, link: response.headers.get('link') });
    if (!body.hasMore) {
      return pages;
    }
    const { since: _since, ...rest } = current;
    current = { ...rest, cursor: body.nextCursor };
  }
  throw new Error('Too many pages');
}

async function setup(args?: { permissions?: string[] }) {
  const owner = await initSeed().createOwner();
  const org = await owner.createOrg();
  const token = await org.createOrganizationAccessToken({
    permissions: args?.permissions ?? ['auditLog:describe'],
    resources: { mode: ResourceAssignmentModeType.All },
  });
  return { org, organization: org.organization, token: token.privateAccessKey };
}

describe.concurrent('GET /audit-log/v1/events', () => {
  test.concurrent('rejects requests without an access token', async ({ expect }) => {
    const response = await fetchEvents({}, null);
    expect(response.status).toBe(401);
    expect(AuditLogApiErrorModel.parse(response.body).error.code).toBe('UNAUTHENTICATED');
  });

  test.concurrent('rejects access tokens without auditLog:describe', async ({ expect }) => {
    const { token } = await setup({ permissions: ['member:describe'] });
    const response = await fetchEvents({}, token);
    expect(response.status).toBe(403);
    expect(AuditLogApiErrorModel.parse(response.body).error.code).toBe('FORBIDDEN');
  });

  test.concurrent('maps events to the v1 envelope', async ({ expect }) => {
    const { organization, token } = await setup();
    const timestamp = nowSeconds() - 2 * HOUR;
    const id = crypto.randomUUID();
    await insertEvents(organization.id, [
      {
        id,
        timestamp,
        eventAction: 'USER_INVITED',
        userId: 'b0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11',
        userEmail: 'marty@mcfly.dev',
        ipAddress: '203.0.113.7',
        userAgent: 'integration-test',
        metadata: {
          inviteeEmail: 'doc@brown.dev',
          roleId: 'c0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11',
          user: { id: 'b0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11', email: 'marty@mcfly.dev' },
        },
      },
    ]);

    const response = await fetchEvents(
      { since: new Date((timestamp - 60) * 1000).toISOString(), eventTypes: 'USER_INVITED' },
      token,
    );

    expect(response.status).toBe(200);
    const body = AuditLogEventsPageModel.parse(response.body);
    expect(body.events.find(event => event.id === id)).toEqual({
      version: 1,
      id,
      timestamp: new Date(timestamp * 1000).toISOString().replace('.000Z', 'Z'),
      eventType: 'USER_INVITED',
      organization: { id: organization.id },
      actor: {
        type: 'user',
        user: { id: 'b0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11', email: 'marty@mcfly.dev' },
        accessToken: null,
        ipAddress: '203.0.113.7',
        userAgent: 'integration-test',
      },
      metadata: { inviteeEmail: 'doc@brown.dev', roleId: 'c0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11' },
    });
  });

  test.concurrent('maps access token and system actors', async ({ expect }) => {
    const { organization, token } = await setup();
    const timestamp = nowSeconds() - 2 * HOUR;
    const byAccessToken = {
      id: crypto.randomUUID(),
      timestamp,
      eventAction: 'SCIM_USER_CREATED',
      accessTokenId: 'd0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11',
      ipAddress: '198.51.100.1',
      metadata: {
        email: 'marty@mcfly.dev',
        accessToken: { id: 'd0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11', firstCharacters: 'hvo1/abc' },
      },
    };
    const bySystem = {
      id: crypto.randomUUID(),
      timestamp: timestamp + 1,
      eventAction: 'USER_SIGN_IN_FAILED',
      metadata: { email: 'doc@brown.dev' },
    };
    const withMalformedMetadata = {
      id: crypto.randomUUID(),
      timestamp: timestamp + 2,
      eventAction: 'USER_SIGN_IN_FAILED',
      rawMetadata: 'not json',
    };
    await insertEvents(organization.id, [byAccessToken, bySystem, withMalformedMetadata]);

    const pages = await fetchAllPages(
      {
        since: new Date((timestamp - 60) * 1000).toISOString(),
        eventTypes: 'SCIM_USER_CREATED,USER_SIGN_IN_FAILED',
      },
      token,
    );
    const events = new Map(
      pages.flatMap(page => page.body.events).map(event => [event.id, event] as const),
    );

    expect(events.get(byAccessToken.id)).toMatchObject({
      eventType: 'SCIM_USER_CREATED',
      actor: {
        type: 'organizationAccessToken',
        user: null,
        accessToken: { id: 'd0a1e7a6-3c3b-4a51-9a8e-0d5f6f1d2c11', firstCharacters: 'hvo1/abc' },
        ipAddress: '198.51.100.1',
        userAgent: null,
      },
      // The acting access token is lifted into `actor`, not repeated in the metadata.
      metadata: { email: 'marty@mcfly.dev' },
    });
    expect(events.get(bySystem.id)).toMatchObject({
      actor: { type: 'system', user: null, accessToken: null, ipAddress: null, userAgent: null },
      metadata: { email: 'doc@brown.dev' },
    });
    expect(events.get(withMalformedMetadata.id)?.metadata).toEqual({});
  });

  test.concurrent(
    'paginates every event exactly once in (timestamp, id) order, including events sharing a second',
    async ({ expect }) => {
      const { organization, token } = await setup();
      const start = nowSeconds() - 3 * HOUR;
      const inserted: InsertedEvent[] = [];
      // 12 events in the same second, then 13 one second apart.
      for (let i = 0; i < 12; i++) {
        inserted.push({ id: crypto.randomUUID(), timestamp: start, eventAction: 'USER_JOINED' });
      }
      for (let i = 1; i <= 13; i++) {
        inserted.push({
          id: crypto.randomUUID(),
          timestamp: start + i,
          eventAction: 'USER_JOINED',
        });
      }
      await insertEvents(organization.id, inserted);

      const pages = await fetchAllPages(
        { since: new Date((start - 60) * 1000).toISOString(), limit: '7' },
        token,
      );

      const insertedIds = new Set(inserted.map(event => event.id));
      const returned = pages
        .flatMap(page => page.body.events)
        .filter(event => insertedIds.has(event.id));

      const expected = [...inserted]
        .sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map(event => event.id);

      expect(returned.map(event => event.id)).toEqual(expected);
      expect(pages.length).toBeGreaterThanOrEqual(4);
      for (const page of pages.slice(0, -1)) {
        expect(page.body.events).toHaveLength(7);
        expect(page.link).toContain('rel="next"');
        // Relative to the URL the client called, carrying the cursor and limit.
        const nextRef = page.link!.match(/^<([^>]+)>/)![1];
        expect(nextRef.startsWith('/audit-log/v1/events?')).toBe(true);
        const next = new URL(nextRef, baseUrl);
        expect(next.searchParams.get('cursor')).toBe(page.body.nextCursor);
        expect(next.searchParams.get('limit')).toBe('7');
      }
      expect(pages.at(-1)!.link).toBeNull();
    },
  );

  test.concurrent('does not return events younger than the settle lag', async ({ expect }) => {
    const { organization, token } = await setup();
    const fresh = { id: crypto.randomUUID(), timestamp: nowSeconds(), eventAction: 'USER_JOINED' };
    const settled = {
      id: crypto.randomUUID(),
      timestamp: nowSeconds() - 10 * 60,
      eventAction: 'USER_JOINED',
    };
    await insertEvents(organization.id, [fresh, settled]);

    const pages = await fetchAllPages(
      { since: new Date((settled.timestamp - 60) * 1000).toISOString(), eventTypes: 'USER_JOINED' },
      token,
    );
    const ids = pages.flatMap(page => page.body.events.map(event => event.id));

    expect(ids).toContain(settled.id);
    expect(ids).not.toContain(fresh.id);
  });

  test.concurrent('filters by event type', async ({ expect }) => {
    const { organization, token } = await setup();
    const timestamp = nowSeconds() - 2 * HOUR;
    const joined = { id: crypto.randomUUID(), timestamp, eventAction: 'USER_JOINED' };
    const invited = {
      id: crypto.randomUUID(),
      timestamp: timestamp + 1,
      eventAction: 'USER_INVITED',
    };
    await insertEvents(organization.id, [joined, invited]);

    const pages = await fetchAllPages(
      { since: new Date((timestamp - 60) * 1000).toISOString(), eventTypes: 'USER_JOINED' },
      token,
    );
    const events = pages.flatMap(page => page.body.events);

    expect(events.map(event => event.id)).toContain(joined.id);
    expect(events.map(event => event.id)).not.toContain(invited.id);
    expect(events.every(event => event.eventType === 'USER_JOINED')).toBe(true);
  });

  test.concurrent(
    'advances the cursor past non-matching events when the filter matches nothing',
    async ({ expect }) => {
      const { organization, token } = await setup();
      const timestamp = nowSeconds() - 2 * HOUR;
      const events = [
        { id: crypto.randomUUID(), timestamp, eventAction: 'USER_JOINED' },
        { id: crypto.randomUUID(), timestamp: timestamp + 1, eventAction: 'USER_INVITED' },
      ];
      await insertEvents(organization.id, events);

      const filtered = await fetchEvents(
        {
          since: new Date((timestamp - 60) * 1000).toISOString(),
          eventTypes: 'SCIM_GROUP_DELETED',
        },
        token,
      );
      expect(filtered.status).toBe(200);
      const body = AuditLogEventsPageModel.parse(filtered.body);
      expect(body.events).toEqual([]);
      expect(body.hasMore).toBe(false);

      // Reading on from that cursor without a filter does not return the skipped events again.
      const pages = await fetchAllPages({ cursor: body.nextCursor }, token);
      const ids = pages.flatMap(page => page.body.events.map(event => event.id));
      for (const event of events) {
        expect(ids).not.toContain(event.id);
      }
    },
  );

  test.concurrent('returns a usable cursor on an empty page', async ({ expect }) => {
    const { organization, token } = await setup();
    const since = new Date((nowSeconds() - 5 * HOUR) * 1000).toISOString();
    const first = await fetchEvents({ since, eventTypes: 'SCIM_GROUP_DELETED' }, token);
    expect(first.status).toBe(200);
    const firstBody = AuditLogEventsPageModel.parse(first.body);
    expect(firstBody.events).toEqual([]);

    const later = {
      id: crypto.randomUUID(),
      timestamp: nowSeconds() - 2 * HOUR,
      eventAction: 'USER_JOINED',
    };
    await insertEvents(organization.id, [later]);

    const pages = await fetchAllPages({ cursor: firstBody.nextCursor }, token);
    expect(pages.flatMap(page => page.body.events.map(event => event.id))).toContain(later.id);
  });

  test.concurrent('never returns events of another organization', async ({ expect }) => {
    const { token } = await setup();
    const other = await setup();
    const timestamp = nowSeconds() - 2 * HOUR;
    const foreign = { id: crypto.randomUUID(), timestamp, eventAction: 'USER_JOINED' };
    await insertEvents(other.organization.id, [foreign]);

    const pages = await fetchAllPages(
      { since: new Date((timestamp - 60) * 1000).toISOString() },
      token,
    );
    expect(pages.flatMap(page => page.body.events.map(event => event.id))).not.toContain(
      foreign.id,
    );
  });

  test.concurrent('reports a cursor older than the retention period', async ({ expect }) => {
    const { token } = await setup();
    const cursor = encodeAuditLogCursor({ timestamp: nowSeconds() - 2 * 365 * 24 * HOUR, id: '' });
    const response = await fetchEvents({ cursor, limit: '1' }, token);
    expect(response.status).toBe(200);
    expect(AuditLogEventsPageModel.parse(response.body).cursorExpired).toBe(true);
  });

  test.concurrent.each([
    [{ cursor: 'not-a-cursor' }, 'INVALID_CURSOR'],
    [{ cursor: Buffer.from('not json').toString('base64url') }, 'INVALID_CURSOR'],
    [{ cursor: rawCursor({ v: 2, timestamp: 1, id: 'a' }) }, 'INVALID_CURSOR'],
    [{ cursor: rawCursor({ v: 1, timestamp: -1, id: 'a' }) }, 'INVALID_CURSOR'],
    [{ cursor: rawCursor({ v: 1, timestamp: 1.5, id: 'a' }) }, 'INVALID_CURSOR'],
    [{ cursor: rawCursor({ v: 1, timestamp: 1, id: 'a'.repeat(129) }) }, 'INVALID_CURSOR'],
    [
      { cursor: encodeAuditLogCursor({ timestamp: nowSeconds() + 24 * HOUR, id: '' }) },
      'INVALID_CURSOR',
    ],
    [{ eventTypes: 'NOT_AN_EVENT' }, 'INVALID_PARAMETER'],
    [{ eventTypes: ',' }, 'INVALID_PARAMETER'],
    [{ limit: '0' }, 'INVALID_PARAMETER'],
    [{ limit: '1001' }, 'INVALID_PARAMETER'],
    [{ limit: 'ten' }, 'INVALID_PARAMETER'],
    [{ since: 'yesterday' }, 'INVALID_PARAMETER'],
  ])('rejects invalid parameters %o', async (params, code) => {
    const { token } = await setup();
    const response = await fetchEvents(params as Record<string, string>, token);
    expect(response.status).toBe(400);
    expect(AuditLogApiErrorModel.parse(response.body).error.code).toBe(code);
  });
});
