import { vi } from 'vitest';
import type { OrganizationInvitation } from '../../../shared/entities';
import type { Delivery, DeliveryReader } from './delivery-reader';
import { EmailDeliveries, invitationDeliveryKey } from './email-deliveries';

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn() }) };

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

function createProvider(latest: Delivery[] | Error) {
  const getLatestByKey = vi.fn<DeliveryReader['getLatestByKey']>(() =>
    latest instanceof Error
      ? Promise.reject(latest)
      : Promise.resolve(new Map(latest.map(delivery => [delivery.idempotencyKey!, delivery]))),
  );
  const provider = new EmailDeliveries({ getLatestByKey } as any, logger as any);
  return { provider, getLatestByKey };
}

describe('invitationDeliveryKey', () => {
  test('names the event, the invitation by its creation time, and the recipient', () => {
    expect(invitationDeliveryKey(invitation())).toBe(
      'organization-invitation:2026-11-03T10:00:00.000Z:alice@example.com',
    );
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
    const { provider, getLatestByKey } = createProvider([alice, bob]);

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
    const { provider } = createProvider([
      delivery({
        timestamp: new Date('2026-11-03T10:30:00.000Z'),
        attempt: 4,
        idempotencyKey: 'organization-invitation:2026-11-01T09:00:00.000Z:alice@example.com',
      }),
    ]);

    await expect(provider.getLatestInvitationDelivery(invitation())).resolves.toBeNull();
  });

  test('answers null for every invitation when the history could not be read', async () => {
    const { provider } = createProvider(new Error('ClickHouse is down'));

    await expect(
      Promise.all([
        provider.getLatestInvitationDelivery(invitation()),
        provider.getLatestInvitationDelivery(invitation({ id: 'i2', email: 'bob@example.com' })),
      ]),
    ).resolves.toEqual([null, null]);
  });
});
