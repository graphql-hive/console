import { AccessError } from '../../../shared/errors';
import { NoopLogger } from '../../shared/providers/logger';
import { AuthorizationPolicyStatement, Session } from './authz';

class TestSession extends Session {
  id = 'test-session';
  policyStatements: Array<AuthorizationPolicyStatement>;
  constructor(policyStatements: Array<AuthorizationPolicyStatement>) {
    super({ logger: new NoopLogger() });
    this.policyStatements = policyStatements;
  }

  public loadPolicyStatementsForOrganization(
    _: string,
  ): Promise<Array<AuthorizationPolicyStatement>> | Array<AuthorizationPolicyStatement> {
    return this.policyStatements;
  }

  getActor(): Promise<never> {
    throw new Error('Not implemented');
  }
}

describe('Session.assertPerformAction', () => {
  test('No policies results in rejection', async () => {
    const session = new TestSession([]);
    const result = await session
      .assertPerformAction({
        organizationId: '50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
        action: 'organization:describe',
        params: {
          organizationId: '50b84370-49fc-48d4-87cb-bde5a3c8fd2f',
        },
      })
      .catch(error => error);
    expect(result).toBeInstanceOf(AccessError);
  });
  test('Single allow policy on specific resource allows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource:
          'hrn:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:organization/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toEqual(undefined);
  });
  test('Single policy on wildcard resource id allows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:organization/*',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toEqual(undefined);
  });
  test('Single policy on wildcard organization allows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:*:organization/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toEqual(undefined);
  });
  test('Single policy on wildcard organization and resource id allows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:*:organization/*',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toEqual(undefined);
  });
  test('Single policy on wildcard resource allows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:*',
        action: 'organization:describe',
      },
    ]);
    await session.assertPerformAction({
      organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      action: 'organization:describe',
      params: {
        organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      },
    });
  });
  test('Single policy on different organization disallows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:cccccccc-cccc-cccc-cccc-cccccccccccc:*',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toBeInstanceOf(AccessError);
  });
  test('A single deny policy always disallows action', async () => {
    const session = new TestSession([
      {
        effect: 'allow',
        resource: 'hrn:*:*',
        action: 'organization:describe',
      },
      {
        effect: 'deny',
        resource: 'hrn:*:*',
        action: 'organization:describe',
      },
    ]);
    const result = await session
      .assertPerformAction({
        organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        action: 'organization:describe',
        params: {
          organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      })
      .catch(error => error);
    expect(result).toBeInstanceOf(AccessError);
  });

  test('Allow on org level, but deny on project level for single resource', async () => {
    const orgId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const bId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const cId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    const session = new TestSession([
      {
        effect: 'allow',
        action: 'project:describe',
        resource: [`hrn:${orgId}:organization/${orgId}`],
      },
      {
        effect: 'deny',
        action: 'project:describe',
        resource: [`hrn:${orgId}:project/${cId}`],
      },
    ]);

    const result1 = await session
      .assertPerformAction({
        action: 'project:describe',
        organizationId: orgId,
        params: {
          organizationId: orgId,
          projectId: bId,
        },
      })
      .catch(err => err);
    expect(result1).toEqual(undefined);
    const result2 = await session
      .assertPerformAction({
        action: 'project:describe',
        organizationId: orgId,
        params: {
          organizationId: orgId,
          projectId: cId,
        },
      })
      .catch(err => err);
    expect(result2).toBeInstanceOf(AccessError);
  });

  test('Allow if no resource was specified on the permission', async () => {
    const orgId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const bId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const cId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    const session = new TestSession([
      {
        effect: 'allow',
        action: 'appDeployment:create',
        resource: [],
      },
    ]);

    const result1 = await session
      .assertPerformAction({
        action: 'appDeployment:create',
        organizationId: orgId,
        params: {
          organizationId: orgId,
          projectId: bId,
          targetId: cId,
          appDeploymentName: 'test',
        },
      })
      .catch(err => err);
    expect(result1).toEqual(undefined);
  });
});
