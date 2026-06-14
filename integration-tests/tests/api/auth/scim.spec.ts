import { ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import z from 'zod';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { psql } from '@hive/postgres';
import { invariant } from '@hive/service-common';
import { createStorage } from '@hive/storage';

const apiHost = await getServiceHost('server', 3001).then(r => `http://${r}`);
const oidcEndpointBase = apiHost + '/scim/v2';
const usersEndpoint = oidcEndpointBase + '/Users';
const groupsEndpoint = oidcEndpointBase + '/Groups';

const defaultUserValues = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  userName: 'marty@mcfly.dev',
  name: { givenName: 'Marty', familyName: 'McFly' },
  emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
  locale: 'en-US',
  externalId: 'userExternalId',
  password: 'fq77ZD37',
  active: true,
};

async function createUser(
  headers: Record<string, string>,
  overrides?: Partial<typeof defaultUserValues>,
) {
  return await fetch(usersEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      ...defaultUserValues,
      userName: `marty+${crypto.randomUUID()}@mcfly.dev`,
      externalId: crypto.randomUUID(),
      ...overrides,
    }),
    headers,
  });
}

const defaultGroupValues = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
  displayName: 'foobars',
  members: [],
  externalId: undefined as string | undefined,
};

async function createGroup(
  headers: Record<string, string>,
  overrides?: Partial<typeof defaultGroupValues>,
) {
  return await fetch(groupsEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      ...defaultGroupValues,
      displayName: crypto.randomUUID(),
      ...overrides,
    }),
    headers,
  });
}

async function getGroups(
  headers: Record<string, string>,
  query?: {
    count?: string;
    startIndex?: string;
    filter?: string;
  },
) {
  const url = new URL(groupsEndpoint);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  return await fetch(url, {
    headers,
  });
}

async function getUsers(
  headers: Record<string, string>,
  query?: {
    count?: string;
    startIndex?: string;
    filter?: string;
  },
) {
  const url = new URL(usersEndpoint);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }
  return await fetch(url, {
    headers,
  });
}

describe.concurrent('/Users', () => {
  describe.concurrent('POST', () => {
    test.concurrent('create new user succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const userEmail = 'marty@' + domain;
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: userEmail,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: userEmail, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      const body = await usersPostResponse.json();
      expect(usersPostResponse.status).toEqual(201);
      expect(body).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: userEmail,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        meta: {
          resourceType: 'User',
        },
        active: true,
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: userEmail,
      });
    });
    test.concurrent(
      'create new multiple users withdifferent emails succeeds',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        const { registerFakeDomain } = await org.createOIDCIntegration();
        const domain = await registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const externalUserId = 'externbal_user_id';
        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };
        const usersPostResponse = await fetch(usersEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'emmett.brown@' + domain,
            name: { givenName: 'Emmett', familyName: 'Brown' },
            emails: [{ primary: true, value: 'emmett.brown@' + domain, type: 'work' }],
            displayName: 'Emmett Brown',
            locale: 'en-US',
            externalId: externalUserId,
            groups: [],
            password: 'foobars',
            active: true,
          }),
          headers,
        });
        expect(usersPostResponse.status).toEqual(201);
        const body = await usersPostResponse.json();
        expect(body).toEqual({
          emails: [
            {
              primary: true,
              type: 'work',
              value: 'emmett.brown@' + domain,
            },
          ],
          externalId: externalUserId,
          id: expect.any(String),
          meta: {
            resourceType: 'User',
          },
          active: true,
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'emmett.brown@' + domain,
        });
      },
    );
    test.concurrent('create new user with non-verified domain fails', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty@mcfly.dev',
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(400);
      const usersPostResponseBody = await usersPostResponse.json();
      expect(usersPostResponseBody).toMatchInlineSnapshot(`
        {
          detail: Primary email address domain ownership is not verified for this organization.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 400,
        }
      `);
    });
    test.concurrent(
      'create user with external id conflict yields correct error response',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        const { registerFakeDomain } = await org.createOIDCIntegration();
        const domain = await registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const externalUserId = 'externbal_user_id';
        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };
        let usersPostResponse = await fetch(usersEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'emmett.brown@' + domain,
            name: { givenName: 'Emmett', familyName: 'Brown' },
            emails: [{ primary: true, value: 'emmett.brown@' + domain, type: 'work' }],
            displayName: 'Emmett Brown',
            locale: 'en-US',
            externalId: externalUserId,
            groups: [],
            password: 'foobars',
            active: true,
          }),
          headers,
        });
        expect(usersPostResponse.status).toEqual(201);
        usersPostResponse = usersPostResponse = await fetch(usersEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'marty.mcfly@' + domain,
            name: { givenName: 'Marty', familyName: 'McFly' },
            emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
            displayName: 'Marty McFly',
            locale: 'en-US',
            externalId: externalUserId,
            groups: [],
            password: 'fq77ZD37',
            active: true,
          }),
          headers,
        });
        expect(usersPostResponse.status).toEqual(409);
        expect(await usersPostResponse.json()).toMatchInlineSnapshot(`
        {
          detail: A user with the same external id already exists.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 409,
        }
      `);
      },
    );
    test.concurrent('create inactive user succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: false,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const body = await usersPostResponse.json();
      expect(body).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly@' + domain,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        meta: {
          resourceType: 'User',
        },
        active: false,
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'marty.mcfly@' + domain,
      });
    });
  });
  describe.concurrent('PUT', () => {
    test.concurrent(
      'update non-existing user yields correct error response',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        const { registerFakeDomain } = await org.createOIDCIntegration();
        const domain = await registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const externalUserId = '00u13w8ptpbdysgOl698';
        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };
        const usersPostResponse = await fetch(usersEndpoint + '/' + crypto.randomUUID(), {
          method: 'PUT',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'marty@mcfly.dev',
            name: { givenName: 'Marty', familyName: 'McFly' },
            emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
            displayName: 'Marty McFly',
            locale: 'en-US',
            externalId: externalUserId,
            groups: [],
            password: 'fq77ZD37',
            active: true,
          }),
          headers,
        });
        expect(usersPostResponse.status).toEqual(404);
        expect(await usersPostResponse.json()).toMatchInlineSnapshot(`
        {
          detail: User does not exist.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 404,
        }
      `);
      },
    );
    test.concurrent('update active succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersPostResponseBody = await usersPostResponse.json();

      const usersPutResponse = await fetch(usersEndpoint + '/' + usersPostResponseBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: false,
        }),
        headers,
      });
      expect(usersPutResponse.status).toEqual(200);
      expect(await usersPutResponse.json()).toEqual({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: usersPostResponseBody.id,
        userName: 'marty.mcfly@' + domain,
        emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
        externalId: externalUserId,
        active: false,
        meta: {
          resourceType: 'User',
        },
      });
    });
    test.concurrent('update email succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersPostResponseBody = await usersPostResponse.json();

      const usersPutResponse = await fetch(usersEndpoint + '/' + usersPostResponseBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly2@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly2@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: false,
        }),
        headers,
      });
      expect(usersPutResponse.status).toEqual(200);
      expect(await usersPutResponse.json()).toMatchObject({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'marty.mcfly2@' + domain,
        emails: [{ primary: true, value: 'marty.mcfly2@' + domain, type: 'work' }],
        active: false,
      });
    });
    test.concurrent('update email to non-verified domain fails', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersPostResponseBody = await usersPostResponse.json();

      const usersPutResponse = await fetch(usersEndpoint + '/' + usersPostResponseBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
        }),
        headers,
      });
      expect(usersPutResponse.status).toEqual(400);
      expect(await usersPutResponse.json()).toMatchInlineSnapshot(`
        {
          detail: Primary email address domain ownership is not verified for this organization.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 400,
        }
      `);
    });
    test.concurrent('update userName succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await createUser(headers, {
        emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
      });
      const userPostBody = await usersPostResponse.json();

      const usersPutResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          userName: 'marty@mcfly.com',
        }),
        headers,
      });
      expect(usersPutResponse.status).toEqual(200);
      expect(await usersPutResponse.json()).toEqual({
        ...userPostBody,
        userName: 'marty@mcfly.com',
      });
    });
    test.concurrent(
      'update userName conflict yields correct error response',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        const { registerFakeDomain } = await org.createOIDCIntegration();
        const domain = await registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };
        const usersPostResponse = await createUser(headers, {
          userName: 'userName1',
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
        });
        const userPostBody = await usersPostResponse.json();
        await createUser(headers, {
          userName: 'userName',
          emails: [{ primary: true, value: 'emmett.brown@' + domain, type: 'work' }],
        });

        const usersPutResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
          method: 'PUT',
          body: JSON.stringify({
            userName: 'userName',
          }),
          headers,
        });
        expect(usersPutResponse.status).toEqual(409);
        expect(await usersPutResponse.json()).toMatchInlineSnapshot(`
          {
            detail: Another user with the same userName already exists.,
            schemas: [
              urn:ietf:params:scim:api:messages:2.0:Error,
            ],
            status: 409,
          }
        `);
      },
    );
    test.concurrent('update external id', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = 'iliketurtles';

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const userPostResponse = await createUser(headers, {
        externalId: externalUserId,
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      expect(userPostResponse.status).toEqual(201);
      const userResponseBody = await userPostResponse.json();

      const newExternalId = 'ilikesnakes';

      const usersPutResponse = await fetch(usersEndpoint + '/' + userResponseBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          externalId: newExternalId,
        }),
        headers,
      });

      expect(usersPutResponse.status).toEqual(200);
      expect(await usersPutResponse.json()).toEqual({
        ...userResponseBody,
        externalId: newExternalId,
      });
    });
    test.concurrent(
      'update external id conflict yield correct error response',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        const { registerFakeDomain } = await org.createOIDCIntegration();
        const domain = await registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const externalUserId = 'iliketurtles';

        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };
        const firstUserPostResponse = await createUser(headers, {
          emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
        });
        expect(firstUserPostResponse.status).toEqual(201);
        const firstUserPostResponseBody = await firstUserPostResponse.json();
        const secondUserPostResponse = await createUser(headers, {
          externalId: externalUserId,
          emails: [{ primary: true, type: 'work', value: 'emmet.brown@' + domain }],
        });
        expect(secondUserPostResponse.status).toEqual(201);

        const usersPutResponse = await fetch(usersEndpoint + '/' + firstUserPostResponseBody.id, {
          method: 'PUT',
          body: JSON.stringify({
            externalId: externalUserId,
          }),
          headers,
        });

        expect(usersPutResponse.status).toEqual(409);
        expect(await usersPutResponse.json()).toMatchInlineSnapshot(`
        {
          detail: Another user with the same external id already exists.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 409,
        }
      `);
      },
    );
  });
  describe.concurrent('PATCH', () => {
    test.concurrent('non-existing user', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPatchResponse = await fetch(usersEndpoint + '/' + crypto.randomUUID(), {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [{ op: 'replace', path: 'active', value: false }],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(404);
      expect(await usersPatchResponse.json()).toMatchInlineSnapshot(`
        {
          detail: User does not exist.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 404,
        }
      `);
    });
    test.concurrent('update active', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = await usersPostResponse.json();
      let usersPatchResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [{ op: 'replace', path: 'active', value: false }],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userPostBody,
        active: false,
      });

      usersPatchResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [{ op: 'replace', path: 'active', value: true }],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userPostBody,
        active: true,
      });
    });
    test.concurrent('update email (full object replacement)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = await usersPostResponse.json();

      const usersPatchResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'emails',
              value: [{ value: 'marty.mcfly.2@' + domain, primary: true, type: 'work' }],
            },
          ],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userPostBody,
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly.2@' + domain,
          },
        ],
      });
    });
    test.concurrent('update email (via emails[type eq "work"].value)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = await usersPostResponse.json();

      const usersPatchResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'emails[type eq "work"].value',
              value: 'marty.mcfly2@' + domain,
            },
          ],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userPostBody,
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly2@' + domain,
          },
        ],
      });
    });
    test.concurrent('update email to non-verified domain fails', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { registerFakeDomain } = await org.createOIDCIntegration();
      const domain = await registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = '00u13w8ptpbdysgOl698';
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersPostResponseBody = await usersPostResponse.json();

      const usersPatchResponse = await fetch(usersEndpoint + '/' + usersPostResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'emails',
              value: [{ value: 'marty@mcfly.dev', primary: true, type: 'work' }],
            },
          ],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(400);
      expect(await usersPatchResponse.json()).toMatchInlineSnapshot(`
        {
          detail: Primary email address domain ownership is not verified for this organization.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 400,
        }
      `);
    });
    test.concurrent('update userName', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const usersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = await usersPostResponse.json();

      const usersPatchResponse = await fetch(usersEndpoint + '/' + userPostBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'userName',
              value: 'marty.mcfly.69@' + domain,
            },
          ],
        }),
        headers,
      });
      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userPostBody,
        userName: 'marty.mcfly.69@' + domain,
      });
    });
    test.concurrent('update external id', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const externalUserId = 'iliketurtles';

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const userPostResponse = await createUser(headers, {
        externalId: externalUserId,
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      expect(userPostResponse.status).toEqual(201);
      const userResponseBody = await userPostResponse.json();

      const newExternalId = 'ilikesnakes';

      const usersPatchResponse = await fetch(usersEndpoint + '/' + userResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'externalId',
              value: newExternalId,
            },
          ],
        }),
        headers,
      });

      expect(usersPatchResponse.status).toEqual(200);
      expect(await usersPatchResponse.json()).toEqual({
        ...userResponseBody,
        externalId: newExternalId,
      });
    });
  });
  describe.concurrent('GET', () => {
    test.concurrent('get and paginate users', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createUser(headers, {
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await createUser(headers, {
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });
      await createUser(headers, {
        externalId: 'userC',
        userName: 'User C',
        emails: [{ primary: true, type: 'work', value: 'user-c@' + domain }],
      });

      let users = await getUsers(headers);
      expect(users.status).toEqual(200);
      let initialBody = await users.json();
      expect(initialBody).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 3,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
      });
      expect(initialBody.Resources).toHaveLength(3);
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userA',
          userName: 'User A',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userB',
          userName: 'User B',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userC',
          userName: 'User C',
        }),
      );

      users = await getUsers(headers, {
        count: '1',
      });
      expect(users.status).toEqual(200);
      let body = await users.json();

      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources[0]).toEqual(initialBody.Resources[0]);

      users = await getUsers(headers, {
        count: '2',
      });
      expect(users.status).toEqual(200);
      body = await users.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 2,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 2,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userA',
          userName: 'User A',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userB',
          userName: 'User B',
        }),
      );

      users = await getUsers(headers, {
        startIndex: '2',
      });
      expect(users.status).toEqual(200);
      body = await users.json();
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 2,
        startIndex: 2,
        totalResults: 2,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userB',
          userName: 'User B',
        }),
      );

      users = await getUsers(headers, {
        startIndex: '3',
      });
      expect(users.status).toEqual(200);
      body = await users.json();
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 1,
        startIndex: 3,
        totalResults: 1,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userC',
          userName: 'User C',
        }),
      );
    });
    test.concurrent('find by user name', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createUser(headers, {
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await createUser(headers, {
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      let response = await getUsers(headers, {
        filter: 'userName eq "User A"',
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userA',
        userName: 'User A',
      });

      response = await getUsers(headers, {
        filter: 'userName eq "User B"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userB',
        userName: 'User B',
      });

      response = await getUsers(headers, {
        filter: 'userName eq "User C"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by external id', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createUser(headers, {
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await createUser(headers, {
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      let response = await getUsers(headers, {
        filter: 'externalId eq "userA"',
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userA',
        userName: 'User A',
      });

      response = await getUsers(headers, {
        filter: 'externalId eq "userB"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userB',
        userName: 'User B',
      });

      response = await getUsers(headers, {
        filter: 'externalId eq "userC"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by id', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const userA = await createUser(headers, {
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      }).then(r => r.json());
      const userB = await createUser(headers, {
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      }).then(r => r.json());
      let response = await getUsers(headers, {
        filter: `id eq "${userA.id}"`,
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userA',
        userName: 'User A',
      });

      response = await getUsers(headers, {
        filter: `id eq "${userB.id}"`,
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'userB',
        userName: 'User B',
      });

      response = await getGroups(headers, {
        filter: `id eq "${crypto.randomUUID()}"`,
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by id insert non-uuid', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      let response = await getUsers(headers, {
        filter: 'id eq "asdasd "',
      });
      let body = await response.json();
      expect(response.status).toEqual(200);
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
  });
});

describe.concurrent('/Groups', () => {
  describe.concurrent('POST', () => {
    test.concurrent('create basic group without external id', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();
      expect(postResponseBody).toEqual({
        displayName: 'foobars',
        id: expect.any(String),
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
    test.concurrent(
      'create with external id creates group with external id',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        // currenlty this must exist for the endpoint to be functional
        await org.createOIDCIntegration();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };

        const postResponse = await fetch(groupsEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            displayName: 'foobars',
            members: [],
            externalId: 'myExternalId',
          }),
          headers,
        });
        expect(postResponse.status).toEqual(201);
        const postResponseBody = await postResponse.json();
        expect(postResponseBody).toMatchObject({
          displayName: 'foobars',
          id: expect.any(String),
          externalId: 'myExternalId',
          meta: {
            resourceType: 'Group',
          },
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        });
      },
    );
    test.concurrent('display name conflict yields correct error response', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      let postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'myExternalId',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'foobars',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(409);
      const postResponseBody = await postResponse.json();
      expect(postResponseBody).toMatchInlineSnapshot(`
          {
            detail: A SCIM group with the same display name already exists.,
            schemas: [
              urn:ietf:params:scim:api:messages:2.0:Error,
            ],
            status: 409,
          }
        `);
    });
    test.concurrent('external id conflict yields correct error response', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      let postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'myExternalId',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars1',
          members: [],
          externalId: 'myExternalId',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(409);
      const postResponseBody = await postResponse.json();
      expect(postResponseBody).toMatchInlineSnapshot(`
          {
            detail: A SCIM group with the same external id already exists.,
            schemas: [
              urn:ietf:params:scim:api:messages:2.0:Error,
            ],
            status: 409,
          }
        `);
    });
  });
  describe.concurrent('PUT', () => {
    test.concurrent('non-existing', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const putResponse = await fetch(groupsEndpoint + '/' + crypto.randomUUID(), {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(404);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchInlineSnapshot(`
        {
          detail: Group does not exist.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 404,
        }
      `);
    });
    test.concurrent('update display name', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();
      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'iliketurtles',
          members: [],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      expect(await putResponse.json()).toMatchObject({
        displayName: 'iliketurtles',
        id: postResponseBody.id,
        members: [],
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
    // for more tests see flows
  });
  describe.concurrent('PATCH', () => {
    test.concurrent('non-existing', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const putResponse = await fetch(groupsEndpoint + '/' + crypto.randomUUID(), {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'displayName',
              value: 'ay',
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(404);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchInlineSnapshot(`
        {
          detail: Group does not exist.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 404,
        }
      `);
    });
    test.concurrent('update display name (patch with path)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'displayName',
              value: 'ay',
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        displayName: 'ay',
        // put always includes the member list
        members: [],
      });
    });
    test.concurrent('update display name (patch without path)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              value: {
                displayName: 'ay',
              },
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        displayName: 'ay',
        // put always includes the member list
        members: [],
      });
    });
    test.concurrent('update display name conflict', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'my-external-id',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const otherPostResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars1',
          members: [],
          externalId: 'newExternalId',
        }),
        headers,
      });
      expect(otherPostResponse.status).toEqual(201);

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              value: {
                displayName: 'foobars1',
              },
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(409);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchInlineSnapshot(`
        {
          detail: Another group with the same display name already exists.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 409,
        }
      `);
    });
    test.concurrent('update external id (patch with path)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'my-external-id',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              path: 'externalId',
              value: 'newExternalId',
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        externalId: 'newExternalId',
        // put always includes the member list
        members: [],
      });
    });
    test.concurrent('update external id (patch without path)', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'my-external-id',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              value: {
                externalId: 'newExternalId',
              },
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        externalId: 'newExternalId',
        // put always includes the member list
        members: [],
      });
    });
    test.concurrent('update external id conflict', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'my-external-id',
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const otherPostResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars1',
          members: [],
          externalId: 'newExternalId',
        }),
        headers,
      });
      expect(otherPostResponse.status).toEqual(201);

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'replace',
              value: {
                externalId: 'newExternalId',
              },
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(409);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchInlineSnapshot(`
        {
          detail: Another group with the same external id already exists.,
          schemas: [
            urn:ietf:params:scim:api:messages:2.0:Error,
          ],
          status: 409,
        }
      `);
    });
    test.concurrent('add single member', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // create group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      // create user

      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: 'userExternalId',
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersPostResponseBody = await usersPostResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'add',
              path: 'members',
              value: [{ value: usersPostResponseBody.id }],
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      expect(await putResponse.json()).toEqual({
        displayName: 'foobars',
        id: postResponseBody.id,
        members: [
          {
            $ref: '/Users/' + usersPostResponseBody.id,
            value: usersPostResponseBody.id,
          },
        ],
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
    test.concurrent('add multiple members in batch', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // create group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      // create users

      const firstUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      expect(firstUsersPostResponse.status).toEqual(201);
      const firstUserPostResponseBody = await firstUsersPostResponse.json();
      const secondUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });
      expect(secondUsersPostResponse.status).toEqual(201);
      const secondUserPostResponseBody = await secondUsersPostResponse.json();

      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'add',
              path: 'members',
              value: [{ value: firstUserPostResponseBody.id }],
            },
            {
              op: 'add',
              path: 'members',
              value: [{ value: secondUserPostResponseBody.id }],
            },
          ],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      expect(await putResponse.json()).toEqual({
        displayName: 'foobars',
        id: postResponseBody.id,
        members: expect.arrayContaining([
          {
            $ref: '/Users/' + firstUserPostResponseBody.id,
            value: firstUserPostResponseBody.id,
          },
          {
            $ref: '/Users/' + secondUserPostResponseBody.id,
            value: secondUserPostResponseBody.id,
          },
        ]),
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
    test.concurrent('remove single member', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // create group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      // create users

      const firstUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      expect(firstUsersPostResponse.status).toEqual(201);
      const firstUserPostResponseBody = await firstUsersPostResponse.json();
      const secondUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });
      expect(secondUsersPostResponse.status).toEqual(201);
      const secondUserPostResponseBody = await secondUsersPostResponse.json();

      const addMembersPutResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'add',
              path: 'members',
              value: [{ value: firstUserPostResponseBody.id }],
            },
            {
              op: 'add',
              path: 'members',
              value: [{ value: secondUserPostResponseBody.id }],
            },
          ],
        }),
        headers,
      });
      expect(addMembersPutResponse.status).toEqual(200);

      const removeMembersPutResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'remove',
              path: `members[value eq "${firstUserPostResponseBody.id}"]`,
            },
          ],
        }),
        headers,
      });

      expect(removeMembersPutResponse.status).toEqual(200);
      expect(await removeMembersPutResponse.json()).toEqual({
        displayName: 'foobars',
        id: postResponseBody.id,
        members: [
          {
            $ref: '/Users/' + secondUserPostResponseBody.id,
            value: secondUserPostResponseBody.id,
          },
        ],
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
    test.concurrent('remove multiple members', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // create group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      // create users

      const firstUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      expect(firstUsersPostResponse.status).toEqual(201);
      const firstUserPostResponseBody = await firstUsersPostResponse.json();
      const secondUsersPostResponse = await createUser(headers, {
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      expect(secondUsersPostResponse.status).toEqual(201);
      const secondUserPostResponseBody = await secondUsersPostResponse.json();

      const addMembersPutResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'add',
              path: 'members',
              value: [{ value: firstUserPostResponseBody.id }],
            },
            {
              op: 'add',
              path: 'members',
              value: [{ value: secondUserPostResponseBody.id }],
            },
          ],
        }),
        headers,
      });
      expect(addMembersPutResponse.status).toEqual(200);

      const removeMembersPutResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'PATCH',
        body: JSON.stringify({
          Operations: [
            {
              op: 'remove',
              path: `members[value eq "${firstUserPostResponseBody.id}"]`,
            },
            {
              op: 'remove',
              path: `members[value eq "${secondUserPostResponseBody.id}"]`,
            },
          ],
        }),
        headers,
      });

      expect(removeMembersPutResponse.status).toEqual(200);
      expect(await removeMembersPutResponse.json()).toEqual({
        displayName: 'foobars',
        id: postResponseBody.id,
        members: [],
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });
    });
  });
  describe.concurrent('DELETE', () => {
    test.concurrent(
      'delete non-existing group yields correct error response',
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        // currenlty this must exist for the endpoint to be functional
        await org.createOIDCIntegration();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };

        const putResponse = await fetch(groupsEndpoint + '/' + crypto.randomUUID(), {
          method: 'DELETE',
          headers,
        });
        expect(putResponse.status).toEqual(404);
      },
    );
    test.concurrent('delete group succeeds', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();
      const putResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        method: 'DELETE',
        headers,
      });
      expect(putResponse.status).toEqual(204);

      const getPostResponse = await fetch(groupsEndpoint + '/' + postResponseBody.id, {
        headers,
      });
      expect(getPostResponse.status).toEqual(404);
    });
  });
  describe.concurrent('GET', () => {
    test.concurrent('get and paginate groups', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createGroup(headers, {
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await createGroup(headers, {
        externalId: 'groupB',
        displayName: 'Group B',
      });
      await createGroup(headers, {
        externalId: 'groupC',
        displayName: 'Group C',
      });

      let groups = await getGroups(headers);
      expect(groups.status).toEqual(200);
      let initialBody = await groups.json();
      expect(initialBody).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 3,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
      });
      expect(initialBody.Resources).toHaveLength(3);
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupA',
          displayName: 'Group A',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupB',
          displayName: 'Group B',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupC',
          displayName: 'Group C',
        }),
      );

      groups = await getGroups(headers, {
        count: '1',
      });
      expect(groups.status).toEqual(200);
      let body = await groups.json();

      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources[0]).toEqual(initialBody.Resources[0]);

      groups = await getGroups(headers, {
        count: '2',
      });
      expect(groups.status).toEqual(200);
      body = await groups.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 2,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 2,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupA',
          displayName: 'Group A',
        }),
      );
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupB',
          displayName: 'Group B',
        }),
      );

      groups = await getGroups(headers, {
        startIndex: '2',
      });
      expect(groups.status).toEqual(200);
      body = await groups.json();
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 2,
        startIndex: 2,
        totalResults: 2,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupB',
          displayName: 'Group B',
        }),
      );

      groups = await getGroups(headers, {
        startIndex: '3',
      });
      expect(groups.status).toEqual(200);
      body = await groups.json();
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 1,
        startIndex: 3,
        totalResults: 1,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupC',
          displayName: 'Group C',
        }),
      );
    });
    test.concurrent('find by display name', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createGroup(headers, {
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await createGroup(headers, {
        externalId: 'groupB',
        displayName: 'Group B',
      });

      let response = await getGroups(headers, {
        filter: 'displayName eq "Group A"',
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupA',
        displayName: 'Group A',
      });

      response = await getGroups(headers, {
        filter: 'displayName eq "Group B"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupB',
        displayName: 'Group B',
      });

      response = await getGroups(headers, {
        filter: 'displayName eq "Group C"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by external id', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      await createGroup(headers, {
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await createGroup(headers, {
        externalId: 'groupB',
        displayName: 'Group B',
      });

      let response = await getGroups(headers, {
        filter: 'externalId eq "groupA"',
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupA',
        displayName: 'Group A',
      });

      response = await getGroups(headers, {
        filter: 'externalId eq "groupB"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupB',
        displayName: 'Group B',
      });

      response = await getGroups(headers, {
        filter: 'externalId eq "groupC"',
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by id', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      const groupA = await createGroup(headers, {
        externalId: 'groupA',
        displayName: 'Group A',
      }).then(r => r.json());
      const groupB = await createGroup(headers, {
        externalId: 'groupB',
        displayName: 'Group B',
      }).then(r => r.json());

      let response = await getGroups(headers, {
        filter: `id eq "${groupA.id}"`,
      });
      expect(response.status).toEqual(200);
      let body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupA',
        displayName: 'Group A',
      });

      response = await getGroups(headers, {
        filter: `id eq "${groupB.id}"`,
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 1,
      });
      expect(body.Resources).toHaveLength(1);
      expect(body.Resources[0]).toMatchObject({
        externalId: 'groupB',
        displayName: 'Group B',
      });

      response = await getGroups(headers, {
        filter: `externalId eq "${crypto.randomUUID()}"`,
      });
      expect(response.status).toEqual(200);
      body = await response.json();
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
    test.concurrent('find by id insert non-uuid', async () => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };
      let response = await getGroups(headers, {
        filter: 'id eq "asdasd "',
      });
      let body = await response.json();
      expect(response.status).toEqual(200);
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(body.Resources).toHaveLength(0);
    });
  });
});

describe.concurrent('provider flows', () => {
  /**
   * These tests cover that happen on Okta side after performing certain actions
   * All these tests are for non Okta Integration network actions...
   */
  describe.concurrent('okta (custom app integrations)', () => {
    test.concurrent('provision group', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();
      expect(postResponseBody).toMatchObject({
        displayName: 'foobars',
        id: expect.any(String),
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });

      const groupResourceEndpoint = groupsEndpoint + '/' + postResponseBody.id;

      // after provisioning it seems to verify whether the group exists or not

      const getResponse = await fetch(groupResourceEndpoint, {
        headers,
      });
      expect(getResponse.status).toEqual(200);
      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toMatchObject({
        ...postResponseBody,
        // Should be identical; but also has the empty members property
        members: [],
      });

      // then after the verification and lookup okta also sends a PUT...

      const putResponse = await fetch(groupResourceEndpoint, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchObject({
        ...postResponseBody,
        // Should be identical; but also has the empty members property
        members: [],
      });
    });
    test.concurrent('assign user that does not yet exist to group', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const groupResourceEndpoint = groupsEndpoint + '/' + postResponseBody.id;

      const externalUserId = '00u13w8ptpbdysgOl698';

      const usersPostResponse = await fetch(usersEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          name: { givenName: 'Marty', familyName: 'McFly' },
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
          displayName: 'Marty McFly',
          locale: 'en-US',
          externalId: externalUserId,
          groups: [],
          password: 'fq77ZD37',
          active: true,
        }),
        headers,
      });
      expect(usersPostResponse.status).toEqual(201);
      const usersResponseBody = await usersPostResponse.json();
      expect(usersResponseBody).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly@' + domain,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        meta: {
          resourceType: 'User',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'marty.mcfly@' + domain,
        active: true,
      });

      const putResponse = await fetch(groupResourceEndpoint, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [{ value: usersResponseBody.id, display: null }],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchObject({
        ...postResponseBody,
        // Should be identical; but also has the empty members property
        members: [
          {
            $ref: '/Users/' + usersResponseBody.id,
            value: usersResponseBody.id,
          },
        ],
      });
    });
    test.concurrent(
      'remove user from the only group he is assigned on deactivates the user and removes him from all the group',
      // Context: https://devforum.okta.com/t/oin-scim-integration-and-removal-of-users-from-groups/31015
      async ({ expect }) => {
        const seed = initSeed();
        const owner = await seed.createOwner();
        const org = await owner.createOrg();
        // currenlty this must exist for the endpoint to be functional
        const oidc = await org.createOIDCIntegration();
        const domain = await oidc.registerFakeDomain();
        const accessToken = await org.createOrganizationAccessToken({
          permissions: ['member:describe', 'member:modify'],
          resources: { mode: ResourceAssignmentModeType.Granular },
        });
        const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

        const headers = {
          'Content-Type': 'application/scim+json',
          Authorization: scimAuthHeader,
        };

        // create group

        const postResponse = await fetch(groupsEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            displayName: 'foobars',
            members: [],
          }),
          headers,
        });
        expect(postResponse.status).toEqual(201);
        const postResponseBody = await postResponse.json();

        // create user

        const externalUserId = '00u13w8ptpbdysgOl698';

        const usersPostResponse = await fetch(usersEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'marty.mcfly@' + domain,
            name: { givenName: 'Marty', familyName: 'McFly' },
            emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
            displayName: 'Marty McFly',
            locale: 'en-US',
            externalId: externalUserId,
            groups: [],
            password: 'fq77ZD37',
            active: true,
          }),
          headers,
        });

        expect(usersPostResponse.status).toEqual(201);
        const usersResponseBody = await usersPostResponse.json();

        const groupResourceEndpoint = groupsEndpoint + '/' + postResponseBody.id;

        const putGroupResponse = await fetch(groupResourceEndpoint, {
          method: 'PUT',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            displayName: 'foobars',
            members: [{ value: usersResponseBody.id, display: null }],
          }),
          headers,
        });
        expect(putGroupResponse.status).toEqual(200);

        // on okta we now remove the user from the group
        const userResourceEndpoint = usersEndpoint + '/' + usersResponseBody.id;

        const putUserResponse = await fetch(userResourceEndpoint, {
          method: 'PUT',
          body: JSON.stringify({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            id: usersResponseBody.id,
            externalId: externalUserId,
            userName: 'marty.mcfly@' + domain,
            emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
            meta: { resourceType: 'User' },
            active: false,
          }),
          headers,
        });
        expect(putUserResponse.status).toEqual(200);
        const putUserResponseBody = await putUserResponse.json();

        expect(putUserResponseBody).toEqual({
          emails: [
            {
              primary: true,
              type: 'work',
              value: 'marty.mcfly@' + domain,
            },
          ],
          externalId: externalUserId,
          id: usersResponseBody.id,
          meta: {
            resourceType: 'User',
          },
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          active: false,
        });

        const { pool } = await seed.createDbConnection();
        const user = await pool
          .one(
            psql`
              SELECT "id", to_json("deactivated_at") as "deactivatedAt"
              FROM "users"
              WHERE
                "provisioned_by_organization_id" = ${org.organization.id}
                AND "external_id" = ${externalUserId}
            `,
          )
          .then(
            z.object({
              deactivatedAt: z.string().nullable(),
              id: z.string().uuid(),
            }).parse,
          );
        expect(user.deactivatedAt).not.toBeNull();
        // make sure that the user is also removed from all groups when deactivated
        const membershipCount = await pool
          .oneFirst(psql` SELECT COUNT(*) FROM "group_members" WHERE "user_id" = ${user.id}`)
          .then(z.number().parse);
        expect(membershipCount).toEqual(0);
      },
    );
    test.concurrent('rename group', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      // currenlty this must exist for the endpoint to be functional
      await org.createOIDCIntegration();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      // First Okta tries to provision the group

      const postResponse = await fetch(groupsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        }),
        headers,
      });
      expect(postResponse.status).toEqual(201);
      const postResponseBody = await postResponse.json();

      const groupResourceEndpoint = groupsEndpoint + '/' + postResponseBody.id;

      // Okta uses a put request to update the display name
      // It also includes the whole "member" array, which is a bit annoying and expensive on our end as we cannot distinguish
      // whether this is a display name only update or whole member list update...

      const putResponse = await fetch(groupResourceEndpoint, {
        method: 'PUT',
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'something else',
          members: [],
        }),
        headers,
      });
      expect(putResponse.status).toEqual(200);
      const putResponseBody = await putResponse.json();
      expect(putResponseBody).toMatchObject({
        ...postResponseBody,
        displayName: 'something else',
        // Should be identical; but also has the empty members property
        members: [],
      });
    });
  });
});

test.concurrent(
  'externalId (sub) conflict with existing OIDC user takes over the user',
  async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const { pool } = await seed.createDbConnection();
    const { oidcIntegration, registerFakeDomain } = await org.createOIDCIntegration();
    const domain = await registerFakeDomain();
    const supertokensStore = new SuperTokensStore(pool, new NoopLogger());

    // We gonna create an existing user that signed up via OIDC before.

    const subOrExternalId = 'iliketurtles';
    const email = 'marty.mcfly@' + domain;

    const supertokensUser = await supertokensStore.createOIDCUser({
      email,
      oidcIntegrationId: oidcIntegration.id,
      externalId: subOrExternalId,
    });
    const storage = await createStorage(seed.getPGConnectionString(), 1);

    try {
      await storage.ensureUserExists({
        email,
        firstName: null,
        lastName: null,
        oidcIntegration: oidcIntegration,
        superTokensUserId: supertokensUser.userId,
      });

      // Now we gonna attempt to provision the user with the same sub/externalId via SCIM

      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const userResponse = await createUser(headers, {
        externalId: subOrExternalId,
        emails: [{ primary: true, type: 'work', value: email }],
      });

      expect(userResponse.status).toEqual(201);
    } finally {
      await storage.destroy();
    }
  },
);

test.concurrent(
  'externalId (sub) conflict for OIDC user combined with userName (psql "users"."display_name") conflict for existing SCIM user yields correct error',
  async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const { pool } = await seed.createDbConnection();
    const { oidcIntegration, registerFakeDomain } = await org.createOIDCIntegration();
    const domain = await registerFakeDomain();
    const supertokensStore = new SuperTokensStore(pool, new NoopLogger());

    // We gonna create an existing user that signed up via OIDC before.

    const externalId = 'iliketurtles';
    const email = 'marty.mcfly@' + domain;

    const supertokensUser = await supertokensStore.createOIDCUser({
      email,
      oidcIntegrationId: oidcIntegration.id,
      externalId,
    });
    const storage = await createStorage(seed.getPGConnectionString(), 1);
    try {
      await storage.ensureUserExists({
        email,
        firstName: null,
        lastName: null,
        oidcIntegration: oidcIntegration,
        superTokensUserId: supertokensUser.userId,
      });

      // Now we gonna create some random unrelated scim user

      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: scimAuthHeader,
      };

      const userResponse = await createUser(headers, {
        userName: 'userA',
        emails: [{ primary: true, type: 'work', value: 'emmett.brown@' + domain }],
      });
      expect(userResponse.status).toEqual(201);

      // Now we gonna attempt to provision and take over the OIDC user
      // The important thing is that the userName is shared!

      const conflictUserResponse = await createUser(headers, {
        userName: 'userA',
        externalId,
        emails: [{ primary: true, type: 'work', value: email }],
      });
      expect(conflictUserResponse.status).toEqual(409);
      expect(await conflictUserResponse.json()).toMatchInlineSnapshot(`
      {
        detail: Another user with the same userName already exists.,
        schemas: [
          urn:ietf:params:scim:api:messages:2.0:Error,
        ],
        status: 409,
      }
    `);
    } finally {
      await storage.destroy();
    }
  },
);

test.concurrent('user cannot login via OIDC if SCIM user provisioning is required', async () => {
  const seed = initSeed();
  const owner = await seed.createOwner();
  const org = await owner.createOrg();
  const oidc = await org.createOIDCIntegration();
  const domain = await oidc.registerFakeDomain();
  const email = 'marty.mcfly@' + domain;

  const oidcAuth = await oidc.createMockServerAndUpdateIntegrationEndpoints({
    userProvisioningRequired: true,
  });
  oidcAuth.setUser({
    email,
    userIdClaim: email,
  });

  let authPayload = await oidcAuth.runGetAuthorizationUrl();
  let signInUpResult = await oidcAuth.runSignInUp({
    state: authPayload.state,
  });
  invariant(signInUpResult.type === 'error', 'Expected sign in up to fail.');

  const accessToken = await org.createOrganizationAccessToken({
    permissions: ['member:describe', 'member:modify'],
    resources: { mode: ResourceAssignmentModeType.Granular },
  });
  const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;
  const headers = {
    'Content-Type': 'application/scim+json',
    Authorization: scimAuthHeader,
  };
  const usersPostResponse = await fetch(usersEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: email,
      name: { givenName: 'Marty', familyName: 'McFly' },
      emails: [{ primary: true, value: email, type: 'work' }],
      locale: 'en-US',
      externalId: email,
      active: true,
    }),
    headers,
  });

  expect(usersPostResponse.status).toEqual(201);

  authPayload = await oidcAuth.runGetAuthorizationUrl();
  signInUpResult = await oidcAuth.runSignInUp({
    state: authPayload.state,
  });
  invariant(signInUpResult.type === 'success', 'Expected sign in/up to succeed.');
});
