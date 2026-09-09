import { describe, expect, it, vi } from 'vitest';
import { SupportTicketPriority } from '../../../shared/entities';
import { HiveHttpClientError } from '../../shared/providers/http-client';
import { SupportManager } from './support-manager';

function createSupportManager(overrides?: {
  config?: Partial<{ username: string; password: string; subdomain: string; baseUrl?: string }>;
  httpClient?: Partial<{ get: any; post: any; put: any; delete: any }>;
  organizationManager?: Partial<{ getOrganization: any; getOrganizationMember: any }>;
  storage?: Partial<Record<string, any>>;
  session?: Partial<{ assertPerformAction: any; getViewer: any }>;
  auditLog?: Partial<{ record: any }>;
}) {
  const config = {
    username: 'zendesk-user',
    password: 'zendesk-pass',
    subdomain: 'my-subdomain',
    ...overrides?.config,
  };

  const httpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides?.httpClient,
  };

  const organizationManager = {
    getOrganization: vi.fn().mockResolvedValue({
      id: 'org-1',
      name: 'Test Org',
      billingPlan: 'PRO',
      zendeskId: '100',
    }),
    getOrganizationMember: vi.fn().mockResolvedValue({
      userId: 'user-1',
      connectedToZendesk: true,
    }),
    ...overrides?.organizationManager,
  };

  const storage = {
    getUserById: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'Test User',
      zendeskId: 'zendesk-user-1',
    }),
    setZendeskOrganizationId: vi.fn().mockResolvedValue(undefined),
    setZendeskUserId: vi.fn().mockResolvedValue(undefined),
    setZendeskOrganizationUserConnection: vi.fn().mockResolvedValue(undefined),
    ...overrides?.storage,
  };

  const session = {
    assertPerformAction: vi.fn().mockResolvedValue(undefined),
    getViewer: vi.fn().mockResolvedValue({ id: 'user-1' }),
    ...overrides?.session,
  };

  const auditLog = {
    record: vi.fn().mockResolvedValue(undefined),
    ...overrides?.auditLog,
  };

  const logger = {
    child: () => logger,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as any;

  const manager = new SupportManager(
    config,
    logger,
    httpClient as any,
    organizationManager as any,
    storage as any,
    session as any,
    auditLog as any,
  );

  return { manager, httpClient, storage, session, auditLog };
}

function mockZendesk(httpClient: { get: any; post: any }) {
  httpClient.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/organizations')) return { organization: { id: 100 } };
    if (url.endsWith('/users')) return { user: { id: 200 } };
    if (url.endsWith('/organization_memberships')) return {};
    if (url.endsWith('/tickets')) return { ticket: { id: 300 } };
    throw new Error(`unexpected POST ${url}`);
  });
  httpClient.get.mockResolvedValue({ users: [] });
}

describe('SupportManager: apiRoot', () => {
  it('uses the real Zendesk host when baseUrl is not set', async () => {
    const { manager, httpClient } = createSupportManager({
      config: { subdomain: 'acme' },
      organizationManager: {
        getOrganization: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Test Org',
          billingPlan: 'PRO',
          zendeskId: null,
        }),
      },
    });
    httpClient.post.mockResolvedValue({ organization: { id: 42 } });

    await (manager as any).ensureZendeskOrganizationId('org-1');

    expect(httpClient.post).toHaveBeenCalledWith(
      'https://acme.zendesk.com/api/v2/organizations',
      expect.anything(),
    );
  });

  it('routes through baseUrl while keeping the subdomain in the path when overridden', async () => {
    const { manager, httpClient } = createSupportManager({
      config: { subdomain: 'acme', baseUrl: 'http://localhost:3043' },
      organizationManager: {
        getOrganization: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Test Org',
          billingPlan: 'PRO',
          zendeskId: null,
        }),
      },
    });
    httpClient.post.mockResolvedValue({ organization: { id: 42 } });

    await (manager as any).ensureZendeskOrganizationId('org-1');

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:3043/acme/api/v2/organizations',
      expect.anything(),
    );
  });
});

describe('SupportManager.createTicket', () => {
  it('creates a ticket, records an audit log, and returns the ticket id', async () => {
    const { manager, httpClient, auditLog } = createSupportManager();
    mockZendesk(httpClient);

    const result = await manager.createTicket({
      organizationId: 'org-1',
      subject: 'Something is broken',
      description: 'Steps to reproduce the issue',
      priority: SupportTicketPriority.NORMAL,
    });

    expect(result).toEqual({ ok: { supportTicketId: '300' }, error: null });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SUPPORT_TICKET_CREATED',
        organizationId: 'org-1',
      }),
    );
  });

  it('returns a validation error and never calls Zendesk when input is invalid', async () => {
    const { manager, httpClient, session } = createSupportManager();

    const result = await manager.createTicket({
      organizationId: 'org-1',
      subject: 'ab',
      description: 'ab',
      priority: SupportTicketPriority.NORMAL,
    });

    expect(result.ok).toBeNull();
    expect(result.error).not.toBeNull();
    expect(session.assertPerformAction).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('throws a permission error without calling Zendesk', async () => {
    const { manager, httpClient } = createSupportManager({
      session: {
        assertPerformAction: vi.fn().mockRejectedValue(new Error('Not authorized')),
      },
    });

    await expect(
      manager.createTicket({
        organizationId: 'org-1',
        subject: 'Something is broken',
        description: 'Steps to reproduce the issue',
        priority: SupportTicketPriority.NORMAL,
      }),
    ).rejects.toThrow('Not authorized');

    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('uses deterministic idempotency keys', async () => {
    const { manager, httpClient } = createSupportManager();
    mockZendesk(httpClient);

    const ticketKeyOf = (calls: any[]) =>
      calls.find(call => call[0].endsWith('/tickets'))![1].headers['idempotency-key'];

    const input = {
      organizationId: 'org-1',
      subject: 'Something is broken',
      description: 'Steps to reproduce the issue',
      priority: SupportTicketPriority.NORMAL,
    };

    await manager.createTicket(input);
    const firstKey = ticketKeyOf(httpClient.post.mock.calls);

    httpClient.post.mockClear();
    await manager.createTicket(input);
    const secondKey = ticketKeyOf(httpClient.post.mock.calls);

    httpClient.post.mockClear();
    await manager.createTicket({ ...input, subject: 'A different subject' });
    const thirdKey = ticketKeyOf(httpClient.post.mock.calls);

    expect(firstKey).toBe(secondKey);
    expect(thirdKey).not.toBe(firstKey);
  });

  it.each([
    ['ENTERPRISE', 'enterprise_customer'],
    ['PRO', 'pro_customer'],
    ['HOBBY', 'hobby_customer'],
  ])('maps billing plan %s to customer type %s', async (billingPlan, customerType) => {
    const { manager, httpClient } = createSupportManager({
      organizationManager: {
        getOrganization: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Test Org',
          billingPlan,
          zendeskId: 'zendesk-org-1',
        }),
      },
    });
    mockZendesk(httpClient);

    await manager.createTicket({
      organizationId: 'org-1',
      subject: 'Something is broken',
      description: 'Steps to reproduce the issue',
      priority: SupportTicketPriority.NORMAL,
    });

    const ticketCall = httpClient.post.mock.calls.find((call: any[]) =>
      call[0].endsWith('/tickets'),
    )!;
    expect(ticketCall[1].json.ticket.custom_fields).toEqual([
      { id: 18185379454865, value: customerType },
    ]);
  });

  it('throws for an unknown billing plan', async () => {
    const { manager, httpClient } = createSupportManager({
      organizationManager: {
        getOrganization: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Test Org',
          billingPlan: 'UNKNOWN',
          zendeskId: 'zendesk-org-1',
        }),
      },
    });
    mockZendesk(httpClient);

    await expect(
      manager.createTicket({
        organizationId: 'org-1',
        subject: 'Something is broken',
        description: 'Steps to reproduce the issue',
        priority: SupportTicketPriority.NORMAL,
      }),
    ).rejects.toThrow('Unknown billing plan: UNKNOWN');
  });
});

describe('SupportManager.ensureZendeskUserId', () => {
  it('does not call Zendesk when the user already has an id and is connected', async () => {
    const { manager, httpClient } = createSupportManager();

    const zendeskUserId = await (manager as any).ensureZendeskUserId({
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(zendeskUserId).toBe('zendesk-user-1');
    expect(httpClient.get).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('reuses an existing Zendesk user found by email instead of creating one', async () => {
    const { manager, httpClient, storage } = createSupportManager({
      storage: {
        getUserById: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
          fullName: 'Test User',
          zendeskId: null,
        }),
      },
      organizationManager: {
        getOrganizationMember: vi.fn().mockResolvedValue({
          userId: 'user-1',
          connectedToZendesk: true,
        }),
      },
    });
    httpClient.get.mockResolvedValue({
      users: [{ id: 555, email: 'user@example.com', organization_id: null }],
    });

    const zendeskUserId = await (manager as any).ensureZendeskUserId({
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(zendeskUserId).toBe('555');
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(storage.setZendeskUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      zendeskId: '555',
    });
  });

  it('creates a Zendesk user when none is found by email', async () => {
    const { manager, httpClient, storage } = createSupportManager({
      storage: {
        getUserById: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
          fullName: 'Test User',
          zendeskId: null,
        }),
      },
      organizationManager: {
        getOrganizationMember: vi.fn().mockResolvedValue({
          userId: 'user-1',
          connectedToZendesk: true,
        }),
      },
    });
    httpClient.get.mockResolvedValue({ users: [] });
    httpClient.post.mockResolvedValue({ user: { id: 777 } });

    const zendeskUserId = await (manager as any).ensureZendeskUserId({
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(zendeskUserId).toBe('777');
    expect(storage.setZendeskUserId).toHaveBeenCalledWith({
      userId: 'user-1',
      zendeskId: '777',
    });
  });

  it('connects an existing Zendesk user to the organization when not yet connected', async () => {
    const { manager, httpClient, storage } = createSupportManager({
      organizationManager: {
        getOrganizationMember: vi.fn().mockResolvedValue({
          userId: 'user-1',
          connectedToZendesk: false,
        }),
      },
    });
    httpClient.post.mockResolvedValue({});

    await (manager as any).ensureZendeskUserId({
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/organization_memberships'),
      expect.anything(),
    );
    expect(storage.setZendeskOrganizationUserConnection).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
    });
  });

  it('swallows a 422 (already a member) error from the membership endpoint', async () => {
    const { manager, storage, httpClient } = createSupportManager({
      organizationManager: {
        getOrganizationMember: vi.fn().mockResolvedValue({
          userId: 'user-1',
          connectedToZendesk: false,
        }),
      },
    });
    httpClient.post.mockRejectedValue(new HiveHttpClientError('already a member', '422'));

    await expect(
      (manager as any).ensureZendeskUserId({
        userId: 'user-1',
        organizationId: 'org-1',
      }),
    ).resolves.toBe('zendesk-user-1');
    expect(storage.setZendeskOrganizationUserConnection).toHaveBeenCalled();
  });

  it('rethrows a non-422 error from the membership endpoint', async () => {
    const { manager, storage, httpClient } = createSupportManager({
      organizationManager: {
        getOrganizationMember: vi.fn().mockResolvedValue({
          userId: 'user-1',
          connectedToZendesk: false,
        }),
      },
    });
    httpClient.post.mockRejectedValue(new HiveHttpClientError('server error', '500'));

    await expect(
      (manager as any).ensureZendeskUserId({
        userId: 'user-1',
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('server error');
    expect(storage.setZendeskOrganizationUserConnection).not.toHaveBeenCalled();
  });
});

describe('SupportManager.getTicket', () => {
  it('returns null when the ticket belongs to a different Zendesk organization', async () => {
    const { manager, httpClient } = createSupportManager();
    httpClient.get.mockResolvedValue({
      ticket: {
        id: 300,
        organization_id: 999999,
        priority: 'normal',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        subject: 'subject',
        description: 'description',
      },
    });

    const ticket = await manager.getTicket('org-1', '300');

    expect(ticket).toBeNull();
  });

  it('returns the ticket when it belongs to the caller organization', async () => {
    const { manager, httpClient } = createSupportManager();
    httpClient.get.mockResolvedValue({
      ticket: {
        id: 300,
        organization_id: 100,
        priority: 'normal',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        subject: 'subject',
        description: 'description',
      },
    });

    const ticket = await manager.getTicket('org-1', '300');

    expect(ticket?.id).toBe(300);
  });
});

describe('SupportManager.getTicketComments', () => {
  it('filters out non-public comments and internal voice comments', async () => {
    const { manager, httpClient } = createSupportManager();
    httpClient.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/comments')) {
        return {
          comments: [
            {
              id: 1,
              created_at: '2024-01-01T00:00:00Z',
              public: true,
              author_id: 200,
              type: 'Comment',
              body: 'a public comment',
            },
            {
              id: 2,
              created_at: '2024-01-01T00:00:00Z',
              public: false,
              author_id: 200,
              type: 'Comment',
              body: 'an internal note',
            },
            {
              id: 3,
              created_at: '2024-01-01T00:00:00Z',
              public: true,
              author_id: 200,
              type: 'VoiceComment',
              body: 'a call transcript',
            },
          ],
          meta: { has_more: false },
        };
      }
      if (url.endsWith('/show_many')) {
        return { users: [{ id: 200, role: 'agent' }] };
      }
      throw new Error(`unexpected GET ${url}`);
    });

    const result = await manager.getTicketComments('300');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ id: 1, fromSupport: true });
  });
});
