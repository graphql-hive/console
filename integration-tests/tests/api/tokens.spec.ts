import { createHash, randomBytes } from 'node:crypto';
import { pollFor, readTokenInfo } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { TargetTokenStorage } from '@hive/api/modules/token/providers/target-token-storage';
import { createRedisClient, type ServiceLogger } from '@hive/service-common';
import { ensureEnv } from '../../testkit/env';
import { initSeed } from '../../testkit/seed';

const targetTokenCachePrefix = 'bentocache:target-tokens';

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

test.concurrent('deleting tokens purges their L2 cache entries in one workflow', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, removeTokens } = await createProject(ProjectType.Single);
  const tokens = await Promise.all([
    createTargetAccessToken({ mode: 'noAccess' }),
    createTargetAccessToken({ mode: 'noAccess' }),
  ]);
  const cacheKeys = tokens.map(({ secret }) => {
    const tokenHash = createHash('sha256').update(secret).digest('hex');
    return `${targetTokenCachePrefix}:${tokenHash}`;
  });
  const redis = await createRedisClient(
    {
      host: ensureEnv('REDIS_HOST'),
      password: ensureEnv('REDIS_PASSWORD'),
      port: ensureEnv('REDIS_PORT', 'number'),
      username: undefined,
      tlsEnabled: false,
      clusterModeEnabled: false,
      awsIamAuthEnabled: false,
      awsRegion: undefined,
      awsIamAuthCacheName: undefined,
    },
    { logger: new NoopLogger() as any },
  );

  try {
    expect(await redis.mget(cacheKeys)).toEqual([expect.any(String), expect.any(String)]);

    await removeTokens(tokens.map(({ token }) => token.id));

    await pollFor(async () => (await redis.mget(cacheKeys)).every(value => value === null));
    expect(await redis.mget(cacheKeys)).toEqual([null, null]);
  } finally {
    redis.disconnect();
  }
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

    const token = randomBytes(16).toString('hex');
    const secret = createHash('sha256').update(token).digest('hex');
    const { pool } = await seed.createDbConnection();
    const tokenStorage = new TargetTokenStorage(pool);

    // create new token so it does not yet exist in redis cache
    const record = await tokenStorage.createToken({
      name: 'foo',
      organization: organization.id,
      project: project.id,
      target: target.id,
      scopes: [],
      token: secret,
      tokenAlias: 'foobars',
    });

    // touch the token so it has a date
    await TargetTokenStorage.touchTokenByHash({ pool })(secret);
    const result = await readTokenInfo(token).then(res => res.expectNoGraphQLErrors());
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
  },
);
