import { pollFor, readTokenInfo } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { createTokenStorage } from '@hive/storage';
import { generateToken } from '@hive/tokens';
import { initSeed } from '../../testkit/seed';

test.concurrent('deleting a token should clear the cache', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createTargetAccessToken, removeTokens } = await createProject(ProjectType.Single);
  const {
    secret,
    token: createdToken,
    fetchTokenInfo,
  } = await createTargetAccessToken({ mode: 'noAccess' });

  expect(secret).toBeDefined();

  const tokenInfo = await fetchTokenInfo();

  if (tokenInfo.__typename === 'TokenNotFoundError' || !createdToken) {
    throw new Error('Token not found');
  }

  const expectedResult = {
    // organization
    hasOrganizationRead: true,
    hasOrganizationDelete: false,
    hasOrganizationIntegrations: false,
    hasOrganizationMembers: false,
    hasOrganizationSettings: false,
    // project
    hasProjectRead: true,
    hasProjectDelete: false,
    hasProjectAlerts: false,
    hasProjectOperationsStoreRead: false,
    hasProjectOperationsStoreWrite: false,
    hasProjectSettings: false,
    // target
    hasTargetRead: true,
    hasTargetDelete: false,
    hasTargetSettings: false,
    hasTargetRegistryRead: false,
    hasTargetRegistryWrite: false,
    hasTargetTokensRead: false,
    hasTargetTokensWrite: false,
  };

  expect(tokenInfo).toEqual(expect.objectContaining(expectedResult));
  await removeTokens([createdToken.id]);
  // packages/services/server/src/graphql-handler.ts: Query.tokenInfo is cached for 5 seconds.
  // Fetch the token info again to make sure it's cached
  await expect(fetchTokenInfo()).resolves.toEqual(expect.objectContaining(expectedResult));
  // To make sure the cache is cleared, we need to wait for at least 5 seconds
  await pollFor(
    async () => {
      try {
        await fetchTokenInfo();
        return false;
      } catch (e) {
        return true;
      }
    },
    { maxWait: 5_500 },
  );
  await expect(fetchTokenInfo()).rejects.toThrow();
});

test.concurrent('invalid token yields correct error message', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createTargetAccessToken } = await createProject(ProjectType.Single);
  const { secret } = await createTargetAccessToken({
    mode: 'noAccess',
  });

  const token = new Array(secret.split('').length).fill('x').join('');
  const result = await readTokenInfo(token).then(res => res.expectGraphQLErrors());
  const error = result[0];
  expect(error.message).toEqual('Invalid token provided');
});

test.concurrent('cdn token yields correct error message when used for registry', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createCdnAccess } = await createProject(ProjectType.Single);
  const cdnAccessToken = await createCdnAccess();

  const result = await readTokenInfo(cdnAccessToken.secretAccessToken).then(res =>
    res.expectGraphQLErrors(),
  );
  const error = result[0];
  expect(error.message).toEqual('Invalid token provided');
});

test.concurrent(
  'can not delete token that does not belong to provided selector',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Single);

    const { token, fetchTokenInfo } = await createTargetAccessToken({
      mode: 'readOnly',
    });

    const otherOwner = await seed.createOwner();
    const otherOrg = await otherOwner.createOrg();
    const otherProject = await otherOrg.createProject();

    const ids = await otherProject.removeTokens([token.id]);
    expect(ids).toEqual([]);

    const tokenInfo = await fetchTokenInfo();

    if (tokenInfo.__typename === 'TokenNotFoundError') {
      throw new Error('Token not found');
    }

    expect(tokenInfo).toMatchInlineSnapshot(`
    {
      __typename: TokenInfo,
      hasOrganizationDelete: false,
      hasOrganizationIntegrations: false,
      hasOrganizationMembers: false,
      hasOrganizationRead: true,
      hasOrganizationSettings: false,
      hasProjectAlerts: false,
      hasProjectDelete: false,
      hasProjectOperationsStoreRead: false,
      hasProjectOperationsStoreWrite: false,
      hasProjectRead: true,
      hasProjectSettings: false,
      hasTargetDelete: false,
      hasTargetRead: true,
      hasTargetRegistryRead: true,
      hasTargetRegistryWrite: false,
      hasTargetSettings: false,
      hasTargetTokensRead: false,
      hasTargetTokensWrite: false,
    }
  `);
  },
);

test.concurrent(
  'regression: reading existing token with "last_used_at" from pg database (and not redis cache) does not raise an exception',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createProject, organization } = await createOrg();
    const { project, target } = await createProject();

    const tokenStorage = await createTokenStorage(seed.getPGConnectionString(), 1);

    try {
      const token = generateToken();

      // create new token so it does not yet exist in redis cache
      const record = await tokenStorage.createToken({
        name: 'foo',
        organization: organization.id,
        project: project.id,
        target: target.id,
        scopes: [],
        token: token.hash,
        tokenAlias: token.alias,
      });

      // touch the token so it has a date
      await tokenStorage.touchTokens({ tokens: [{ token: record.token, date: new Date() }] });
      const result = await readTokenInfo(token.secret).then(res => res.expectNoGraphQLErrors());
      expect(result.tokenInfo).toMatchInlineSnapshot(`
        {
          __typename: TokenInfo,
          hasOrganizationDelete: false,
          hasOrganizationIntegrations: false,
          hasOrganizationMembers: false,
          hasOrganizationRead: false,
          hasOrganizationSettings: false,
          hasProjectAlerts: false,
          hasProjectDelete: false,
          hasProjectOperationsStoreRead: false,
          hasProjectOperationsStoreWrite: false,
          hasProjectRead: false,
          hasProjectSettings: false,
          hasTargetDelete: false,
          hasTargetRead: false,
          hasTargetRegistryRead: false,
          hasTargetRegistryWrite: false,
          hasTargetSettings: false,
          hasTargetTokensRead: false,
          hasTargetTokensWrite: false,
        }
      `);
    } finally {
      await tokenStorage.destroy();
    }
  },
);
