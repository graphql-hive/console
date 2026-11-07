import { vi } from 'vitest';
import type { OrganizationInvitation } from '../../../shared/entities';
import type { Delivery, DeliveryReader } from './delivery-reader';
import { EmailDeliveries } from './email-deliveries';

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

function createProvider(latest: Map<string, Delivery> | Error) {
  const getLatestByDestination = vi.fn<DeliveryReader['getLatestByDestination']>(() =>
    latest instanceof Error ? Promise.reject(latest) : Promise.resolve(latest),
  );
  const provider = new EmailDeliveries({ getLatestByDestination } as any, {} as any, logger as any);
  return { provider, getLatestByDestination };
}

describe('EmailDeliveries.getLatestInvitationDelivery', () => {
  test('gives each invitation its latest attempt, matching the address case-insensitively', async () => {
    const alice = delivery();
    const bob = delivery({
      destination: 'Bob@Example.com',
      ok: false,
      statusCode: 422,
      statusText: '406: inactive',
    });
    const { provider, getLatestByDestination } = createProvider(
      new Map([
        ['alice@example.com', alice],
        ['bob@example.com', bob],
      ]),
    );

    const results = await Promise.all([
      provider.getLatestInvitationDelivery(invitation()),
      provider.getLatestInvitationDelivery(invitation({ id: 'i2', email: 'bob@example.com' })),
      provider.getLatestInvitationDelivery(invitation({ id: 'i3', email: 'carol@example.com' })),
    ]);

    expect(results).toEqual([alice, bob, null]);
    expect(getLatestByDestination).toHaveBeenCalledTimes(1);
    expect(getLatestByDestination).toHaveBeenCalledWith({
      organizationId: 'o1',
      deliveryType: 'EMAIL',
      event: 'organization_invitation',
      destinations: ['alice@example.com', 'bob@example.com', 'carol@example.com'],
      since: new Date('2026-11-03T10:00:00.000Z'),
    });
  });

  test('ignores an attempt made before the invitation, which belongs to an earlier invite', async () => {
    const { provider } = createProvider(
      new Map([['alice@example.com', delivery({ timestamp: new Date('2026-11-03T09:59:59Z') })]]),
    );

    await expect(provider.getLatestInvitationDelivery(invitation())).resolves.toBeNull();
  });

  test('keeps an attempt recorded within the second the invitation was created', async () => {
    const attempt = delivery({ timestamp: new Date('2026-11-03T10:00:00.000Z') });
    const { provider } = createProvider(new Map([['alice@example.com', attempt]]));

    await expect(
      provider.getLatestInvitationDelivery(invitation({ createdAt: '2026-11-03T10:00:00.750Z' })),
    ).resolves.toBe(attempt);
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
