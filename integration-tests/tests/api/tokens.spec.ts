import { readTokenInfo, waitFor } from 'testkit/flow';
import { ProjectType, TargetAccessScope } from 'testkit/gql/graphql';
import { initSeed } from '../../testkit/seed';

test.concurrent('deleting a token should clear the cache', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createToken, removeTokens } = await createProject(ProjectType.Single);
  const {
    secret,
    token: createdToken,
    fetchTokenInfo,
  } = await createToken({ targetScopes: [], projectScopes: [], organizationScopes: [] });

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
  await waitFor(5500);
  await expect(fetchTokenInfo()).rejects.toThrow();
});

test.concurrent('invalid token yields correct error message', async () => {
  const { createOrg } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createToken } = await createProject(ProjectType.Single);
  const { secret } = await createToken({
    targetScopes: [],
    projectScopes: [],
    organizationScopes: [],
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
  const { createToken } = await createProject(ProjectType.Single);
  const token = await createToken({
    targetScopes: [
      TargetAccessScope.Delete,
      TargetAccessScope.Read,
      TargetAccessScope.RegistryRead,
      TargetAccessScope.RegistryWrite,
      TargetAccessScope.Settings,
      TargetAccessScope.TokensRead,
      TargetAccessScope.TokensWrite,
    ],
  });
  const cdnAccessToken = await token.createCdnAccess();

  const result = await readTokenInfo(cdnAccessToken.secretAccessToken).then(res =>
    res.expectGraphQLErrors(),
  );
  const error = result[0];
  expect(error.message).toEqual('Invalid token provided');
});
