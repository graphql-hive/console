import { vi } from 'vitest';
import type { OrganizationInvitation } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import type { Delivery, DeliveryReader } from './delivery-reader';
import { EmailDeliveries, invitationDeliveryKey } from './email-deliveries';

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn() }) };
const OWNER_ID = 'owner-1';
const period = { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-03T00:00:00Z') };

function invitation(overrides: Partial<OrganizationInvitation> = {}): OrganizationInvitation {
  return {
    id: 'i1',
    organizationId: 'o1',
    code: 'code-1',
    email: 'alice@example.com',
    createdAt: '2026-11-03T10:00:00.000Z',
    expiresAt: '2026-11-10T10:00:00.000Z',
    roleId: 'r1',
    assignedResources: null,
    ...overrides,
  };
}

function delivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    timestamp: new Date('2026-11-03T10:00:05.000Z'),
    event: 'ORGANIZATION_INVITATION',
    destination: 'alice@example.com',
    idempotencyKey: 'organization-invitation:2026-11-03T10:00:00.000Z:alice@example.com',
    ok: true,
    statusCode: 200,
    statusText: 'OK',
    durationMs: 120,
    attempt: 1,
    maxAttempts: 25,
    metadata: { subject: 'You have been invited to join Acme' },
    ...overrides,
  };
}

function createProvider(
  options: {
    latest?: Delivery[] | Error;
    /** The permissions the session grants on the organization. */
    allowed?: string[];
    actor?: 'owner' | 'member' | 'token';
  } = {},
) {
  const latest: Delivery[] | Error = options.latest ?? [];
  const allowed = new Set(options.allowed ?? []);
  const actor = options.actor ?? 'member';

  const reader = {
    getLatestByKey: vi.fn<DeliveryReader['getLatestByKey']>(() =>
      latest instanceof Error
        ? Promise.reject(latest)
        : Promise.resolve(new Map(latest.map(delivery => [delivery.idempotencyKey!, delivery]))),
    ),
    getLog: vi.fn<DeliveryReader['getLog']>(async () => []),
    getLastOutcomes: vi.fn<DeliveryReader['getLastOutcomes']>(async () => ({
      lastSuccessAt: null,
      lastFailureAt: null,
    })),
  };
  const session = {
    canPerformAction: vi.fn(async (args: { action: string }) => allowed.has(args.action)),
    getActor: async () =>
      actor === 'token'
        ? { type: 'organizationAccessToken', organizationAccessToken: {} }
        : {
            type: 'user',
            user: { id: actor === 'owner' ? OWNER_ID : 'member-1' },
            oidcIntegrationId: null,
          },
  };
  const storage = { getOrganizationOwnerId: vi.fn(async () => OWNER_ID) };

  const provider = new EmailDeliveries(
    reader as any,
    session as any,
    storage as any,
    logger as any,
  );
  return { provider, reader, storage, getLatestByKey: reader.getLatestByKey };
}

describe('invitationDeliveryKey', () => {
  test('names the event, the invitation by its creation time, and the recipient', () => {
    expect(invitationDeliveryKey(invitation())).toBe(
      'organization-invitation:2026-11-03T10:00:00.000Z:alice@example.com',
    );
  });
});

describe('EmailDeliveries reads only the kinds of email the viewer may see', () => {
  test('member:modify shows the invitations', async () => {
    const { provider, reader } = createProvider({ allowed: ['member:modify'] });

    await expect(provider.canRead('o1')).resolves.toBe(true);
    await provider.getLog({ organizationId: 'o1', period, limit: 10 });
    expect(reader.getLog).toHaveBeenCalledWith({
      organizationId: 'o1',
      deliveryType: 'EMAIL',
      events: ['ORGANIZATION_INVITATION'],
      period,
      limit: 10,
    });
  });

  test('auditLog:export and billing:describe show the exports and usage notices, not the invitations', async () => {
    const { provider, reader } = createProvider({
      allowed: ['auditLog:export', 'billing:describe'],
    });

    await provider.getHealth('o1');
    expect(reader.getLastOutcomes).toHaveBeenCalledWith({
      organizationId: 'o1',
      deliveryType: 'EMAIL',
      events: ['AUDIT_LOG_EXPORT', 'USAGE_RATE_LIMIT_WARNING', 'USAGE_RATE_LIMIT_EXCEEDED'],
    });
  });

  test('the owner sees the ownership transfers; an organization access token never does', async () => {
    const owner = createProvider({ actor: 'owner' });
    await owner.provider.getLog({ organizationId: 'o1', period });
    expect(owner.reader.getLog).toHaveBeenCalledWith(
      expect.objectContaining({ events: ['ORGANIZATION_OWNERSHIP_TRANSFER'] }),
    );

    const token = createProvider({
      actor: 'token',
      allowed: ['member:modify', 'auditLog:export', 'billing:describe'],
    });
    await token.provider.getLog({ organizationId: 'o1', period });
    expect(token.reader.getLog).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          'ORGANIZATION_INVITATION',
          'AUDIT_LOG_EXPORT',
          'USAGE_RATE_LIMIT_WARNING',
          'USAGE_RATE_LIMIT_EXCEEDED',
        ],
      }),
    );
    expect(token.storage.getOrganizationOwnerId).not.toHaveBeenCalled();
  });

  test('a viewer who may see no kind of email is refused before anything is read', async () => {
    const { provider, reader } = createProvider();

    await expect(provider.canRead('o1')).resolves.toBe(false);
    await expect(provider.getLog({ organizationId: 'o1', period })).rejects.toThrow(AccessError);
    await expect(provider.getHealth('o1')).rejects.toThrow(AccessError);
    expect(reader.getLog).not.toHaveBeenCalled();
    expect(reader.getLastOutcomes).not.toHaveBeenCalled();
  });

  test('names the kinds the viewer may see and whether any kind is kept from them', async () => {
    const everything = createProvider({
      actor: 'owner',
      allowed: ['member:modify', 'auditLog:export', 'billing:describe'],
    });
    await expect(everything.provider.getVisibility('o1')).resolves.toEqual({
      events: [
        'ORGANIZATION_INVITATION',
        'ORGANIZATION_OWNERSHIP_TRANSFER',
        'AUDIT_LOG_EXPORT',
        'USAGE_RATE_LIMIT_WARNING',
        'USAGE_RATE_LIMIT_EXCEEDED',
      ],
      isLimited: false,
    });

    const invitationsOnly = createProvider({ allowed: ['member:modify'] });
    await expect(invitationsOnly.provider.getVisibility('o1')).resolves.toEqual({
      events: ['ORGANIZATION_INVITATION'],
      isLimited: true,
    });

    await expect(createProvider().provider.getVisibility('o1')).resolves.toEqual({
      events: [],
      isLimited: true,
    });
  });
});

describe('EmailDeliveries.getLatestInvitationDelivery', () => {
  test('gives each invitation the attempt recorded under its key, one query per organization', async () => {
    const alice = delivery();
    const bob = delivery({
      destination: 'bob@example.com',
      idempotencyKey: 'organization-invitation:2026-11-03T11:00:00.000Z:bob@example.com',
      ok: false,
      statusCode: 422,
      statusText: '406: inactive',
    });
    const { provider, getLatestByKey } = createProvider({ latest: [alice, bob] });

    const results = await Promise.all([
      provider.getLatestInvitationDelivery(invitation()),
      provider.getLatestInvitationDelivery(
        invitation({ id: 'i2', email: 'bob@example.com', createdAt: '2026-11-03T11:00:00.000Z' }),
      ),
      provider.getLatestInvitationDelivery(invitation({ id: 'i3', email: 'carol@example.com' })),
    ]);

    expect(results).toEqual([alice, bob, null]);
    expect(getLatestByKey).toHaveBeenCalledTimes(1);
    expect(getLatestByKey).toHaveBeenCalledWith({
      organizationId: 'o1',
      deliveryType: 'EMAIL',
      keys: [
        'organization-invitation:2026-11-03T10:00:00.000Z:alice@example.com',
        'organization-invitation:2026-11-03T11:00:00.000Z:bob@example.com',
        'organization-invitation:2026-11-03T10:00:00.000Z:carol@example.com',
      ],
      since: new Date('2026-11-03T10:00:00.000Z'),
    });
  });

  test('ignores the attempts of an earlier invitation of the same address, even newer ones', async () => {
    // The earlier invitation was deleted by a re-invite, but its job is still retrying.
    const { provider } = createProvider({
      latest: [
        delivery({
          timestamp: new Date('2026-11-03T10:30:00.000Z'),
          attempt: 4,
          idempotencyKey: 'organization-invitation:2026-11-01T09:00:00.000Z:alice@example.com',
        }),
      ],
    });

    await expect(provider.getLatestInvitationDelivery(invitation())).resolves.toBeNull();
  });

  test('answers null for every invitation when the history could not be read', async () => {
    const { provider } = createProvider({ latest: new Error('ClickHouse is down') });

    await expect(
      Promise.all([
        provider.getLatestInvitationDelivery(invitation()),
        provider.getLatestInvitationDelivery(invitation({ id: 'i2', email: 'bob@example.com' })),
      ]),
    ).resolves.toEqual([null, null]);
  });
});
