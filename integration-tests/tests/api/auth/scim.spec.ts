import humanId from 'human-id';
import { addGroupMappingToGroup, createMemberRole } from 'testkit/flow';
import { ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import z from 'zod';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { psql } from '@hive/postgres';
import { invariant } from '@hive/service-common';
import { createStorage } from '@hive/storage';
import { createScimTestkit } from '../../../testkit/scim';

const baseUrl = await getServiceHost('server', 3001).then(r => `http://${r}`);

function newUserValues() {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    userName: `marty+${crypto.randomUUID()}@mcfly.dev`,
    name: { givenName: 'Marty', familyName: 'McFly' },
    emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
    locale: 'en-US',
    externalId: crypto.randomUUID(),
    password: 'fq77ZD37',
    active: true,
  };
}

function newGroupValues() {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    displayName: crypto.randomUUID(),
    members: [],
  };
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });
      expect(usersPostResponse.body).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: userEmail,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        active: true,
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: userEmail,
        groups: [],
        meta: {
          resourceType: 'User',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
        },
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
        const scim = createScimTestkit({ baseUrl, headers });
        const usersPostResponse = await scim.createUser({
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
        });

        expect(usersPostResponse.body).toEqual({
          emails: [
            {
              primary: true,
              type: 'work',
              value: 'emmett.brown@' + domain,
            },
          ],
          externalId: externalUserId,
          id: expect.any(String),
          active: true,
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'emmett.brown@' + domain,
          groups: [],
          meta: {
            resourceType: 'User',
            created: expect.any(String),
            lastModified: expect.any(String),
            location: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
          },
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser(
        {
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
        },
        { expectedStatus: 400 },
      );
      expect(usersPostResponse.body).toMatchInlineSnapshot(`
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
        const scim = createScimTestkit({ baseUrl, headers });
        const usersPostResponse = await scim.createUser({
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
        });
        const conflictUsersPostResponse = await scim.createUser(
          {
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
          },
          { expectedStatus: 409 },
        );
        expect(conflictUsersPostResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });

      expect(usersPostResponse.body).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly@' + domain,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        groups: [],
        active: false,
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'marty.mcfly@' + domain,
        meta: {
          resourceType: 'User',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
        },
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
        const scim = createScimTestkit({ baseUrl, headers });
        const usersPostResponse = await scim.updateUser(
          crypto.randomUUID(),
          {
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
          },
          { expectedStatus: 404 },
        );
        expect(usersPostResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });

      const usersPutResponse = await scim.updateUser(usersPostResponse.body.id, {
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
      });
      expect(usersPutResponse.body).toEqual({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: usersPostResponse.body.id,
        userName: 'marty.mcfly@' + domain,
        emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
        externalId: externalUserId,
        active: false,
        groups: [],
        meta: {
          resourceType: 'User',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });

      const usersPutResponse = await scim.updateUser(usersPostResponse.body.id, {
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
      });
      expect(usersPutResponse.body).toMatchObject({
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });

      const usersPutResponse = await scim.updateUser(
        usersPostResponse.body.id,
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          emails: [{ primary: true, value: 'marty@mcfly.dev', type: 'work' }],
        },
        { expectedStatus: 400 },
      );
      expect(usersPutResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
      });

      const usersPutResponse = await scim.updateUser(usersPostResponse.body.id, {
        userName: 'marty@mcfly.com',
      });
      expect(usersPutResponse.body).toEqual({
        ...usersPostResponse.body,
        userName: 'marty@mcfly.com',
        meta: {
          ...usersPostResponse.body.meta,
          lastModified: expect.any(String),
        },
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
        const scim = createScimTestkit({ baseUrl, headers });
        const usersPostResponse = await scim.createUser({
          ...newUserValues(),
          userName: 'userName1',
          emails: [{ primary: true, value: 'marty.mcfly@' + domain, type: 'work' }],
        });
        const userPostBody = usersPostResponse.body;
        await scim.createUser({
          ...newUserValues(),
          userName: 'userName',
          emails: [{ primary: true, value: 'emmett.brown@' + domain, type: 'work' }],
        });

        const usersPutResponse = await scim.updateUser(
          userPostBody.id,
          {
            userName: 'userName',
          },
          { expectedStatus: 409 },
        );
        expect(usersPutResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const userPostResponse = await scim.createUser({
        ...newUserValues(),
        externalId: externalUserId,
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const newExternalId = 'ilikesnakes';

      const usersPutResponse = await scim.updateUser(userPostResponse.body.id, {
        externalId: newExternalId,
      });

      expect(usersPutResponse.body).toEqual({
        ...userPostResponse.body,
        externalId: newExternalId,
        meta: {
          ...userPostResponse.body.meta,
          lastModified: expect.any(String),
        },
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
        const scim = createScimTestkit({ baseUrl, headers });
        const firstUserPostResponse = await scim.createUser({
          ...newUserValues(),
          emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
        });
        await scim.createUser({
          ...newUserValues(),
          externalId: externalUserId,
          emails: [{ primary: true, type: 'work', value: 'emmet.brown@' + domain }],
        });

        const usersPutResponse = await scim.updateUser(
          firstUserPostResponse.body.id,
          {
            externalId: externalUserId,
          },
          { expectedStatus: 409 },
        );

        expect(usersPutResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPatchResponse = await scim.patchUser(
        crypto.randomUUID(),
        {
          Operations: [{ op: 'replace', path: 'active', value: false }],
        },
        { expectedStatus: 404 },
      );
      expect(usersPatchResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = usersPostResponse.body;
      let usersPatchResponse = await scim.patchUser(userPostBody.id, {
        Operations: [{ op: 'replace', path: 'active', value: false }],
      });
      expect(usersPatchResponse.body).toEqual({
        ...userPostBody,
        active: false,
        meta: {
          ...userPostBody.meta,
          lastModified: expect.any(String),
        },
      });

      usersPatchResponse = await scim.patchUser(userPostBody.id, {
        Operations: [{ op: 'replace', path: 'active', value: true }],
      });
      expect(usersPatchResponse.body).toEqual({
        ...userPostBody,
        active: true,
        meta: {
          ...userPostBody.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const userPostBody = usersPostResponse.body;

      const usersPatchResponse = await scim.patchUser(userPostBody.id, {
        Operations: [
          {
            op: 'replace',
            path: 'emails',
            value: [{ value: 'marty.mcfly.2@' + domain, primary: true, type: 'work' }],
          },
        ],
      });
      expect(usersPatchResponse.body).toEqual({
        ...userPostBody,
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly.2@' + domain,
          },
        ],
        meta: {
          ...userPostBody.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const usersPatchResponse = await scim.patchUser(usersPostResponse.body.id, {
        Operations: [
          {
            op: 'replace',
            path: 'emails[type eq "work"].value',
            value: 'marty.mcfly2@' + domain,
          },
        ],
      });
      expect(usersPatchResponse.body).toEqual({
        ...usersPostResponse.body,
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly2@' + domain,
          },
        ],
        meta: {
          ...usersPostResponse.body.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
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
      });
      const usersPatchResponse = await scim.patchUser(
        usersPostResponse.body.id,
        {
          Operations: [
            {
              op: 'replace',
              path: 'emails',
              value: [{ value: 'marty@mcfly.dev', primary: true, type: 'work' }],
            },
          ],
        },
        { expectedStatus: 400 },
      );
      expect(usersPatchResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });
      const usersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const usersPatchResponse = await scim.patchUser(usersPostResponse.body.id, {
        Operations: [
          {
            op: 'replace',
            path: 'userName',
            value: 'marty.mcfly.69@' + domain,
          },
        ],
      });
      expect(usersPatchResponse.body).toEqual({
        ...usersPostResponse.body,
        userName: 'marty.mcfly.69@' + domain,
        meta: {
          ...usersPostResponse.body.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });
      const userPostResponse = await scim.createUser({
        ...newUserValues(),
        externalId: externalUserId,
        emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
      });
      const newExternalId = 'ilikesnakes';

      const usersPatchResponse = await scim.patchUser(userPostResponse.body.id, {
        Operations: [
          {
            op: 'replace',
            path: 'externalId',
            value: newExternalId,
          },
        ],
      });

      expect(usersPatchResponse.body).toEqual({
        ...userPostResponse.body,
        externalId: newExternalId,
        meta: {
          ...userPostResponse.body.meta,
          lastModified: expect.any(String),
        },
      });
    });
  });
  test.concurrent('includes groups in user update responses', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const oidc = await org.createOIDCIntegration();
    const domain = await oidc.registerFakeDomain();
    const accessToken = await org.createOrganizationAccessToken({
      permissions: ['member:describe', 'member:modify'],
      resources: { mode: ResourceAssignmentModeType.Granular },
    });
    const headers = {
      'Content-Type': 'application/scim+json',
      Authorization: 'Bearer ' + accessToken.privateAccessKey,
    };
    const scim = createScimTestkit({ baseUrl, headers });

    const user = await scim
      .createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'grouped-user@' + domain }],
      })
      .then(response => response.body);
    const firstGroup = await scim.createGroup(newGroupValues()).then(response => response.body);
    const secondGroup = await scim.createGroup(newGroupValues()).then(response => response.body);
    await scim.patchGroup(firstGroup.id, {
      Operations: [{ op: 'add', path: 'members', value: [{ value: user.id }] }],
    });
    await scim.patchGroup(secondGroup.id, {
      Operations: [{ op: 'add', path: 'members', value: [{ value: user.id }] }],
    });

    const expectedGroups = [firstGroup, secondGroup].map(group => ({
      value: group.id,
      $ref: baseUrl + '/scim/v2/Groups/' + group.id,
    }));

    const putResponse = await scim.updateUser(user.id, { userName: 'Updated with PUT' });
    expect(putResponse.body).toMatchObject({
      id: user.id,
      userName: 'Updated with PUT',
      groups: expect.arrayContaining(expectedGroups),
    });
    expect(putResponse.body.groups).toHaveLength(2);

    const patchResponse = await scim.patchUser(user.id, {
      Operations: [{ op: 'replace', path: 'userName', value: 'Updated with PATCH' }],
    });
    expect(patchResponse.body).toMatchObject({
      id: user.id,
      userName: 'Updated with PATCH',
      groups: expect.arrayContaining(expectedGroups),
    });
    expect(patchResponse.body.groups).toHaveLength(2);
  });

  describe.concurrent('GET', () => {
    test.concurrent('includes groups in list and individual user responses', async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const oidc = await org.createOIDCIntegration();
      const domain = await oidc.registerFakeDomain();
      const accessToken = await org.createOrganizationAccessToken({
        permissions: ['member:describe', 'member:modify'],
        resources: { mode: ResourceAssignmentModeType.Granular },
      });
      const headers = {
        'Content-Type': 'application/scim+json',
        Authorization: 'Bearer ' + accessToken.privateAccessKey,
      };
      const scim = createScimTestkit({ baseUrl, headers });

      const firstUser = await scim
        .createUser({
          ...newUserValues(),
          externalId: 'first-grouped-user',
          emails: [{ primary: true, type: 'work', value: 'first-grouped-user@' + domain }],
        })
        .then(response => response.body);
      const secondUser = await scim
        .createUser({
          ...newUserValues(),
          externalId: 'second-grouped-user',
          emails: [{ primary: true, type: 'work', value: 'second-grouped-user@' + domain }],
        })
        .then(response => response.body);
      const firstGroup = await scim.createGroup(newGroupValues()).then(response => response.body);
      const secondGroup = await scim.createGroup(newGroupValues()).then(response => response.body);
      const sharedGroup = await scim.createGroup(newGroupValues()).then(response => response.body);

      await scim.patchGroup(firstGroup.id, {
        Operations: [{ op: 'add', path: 'members', value: [{ value: firstUser.id }] }],
      });
      await scim.patchGroup(sharedGroup.id, {
        Operations: [{ op: 'add', path: 'members', value: [{ value: firstUser.id }] }],
      });
      await scim.patchGroup(secondGroup.id, {
        Operations: [{ op: 'add', path: 'members', value: [{ value: secondUser.id }] }],
      });
      await scim.patchGroup(sharedGroup.id, {
        Operations: [{ op: 'add', path: 'members', value: [{ value: secondUser.id }] }],
      });

      const toGroupReferences = (groups: Array<{ id: string }>) =>
        groups.map(group => ({
          value: group.id,
          $ref: baseUrl + '/scim/v2/Groups/' + group.id,
        }));
      const firstUserGroups = toGroupReferences([firstGroup, sharedGroup]);
      const secondUserGroups = toGroupReferences([secondGroup, sharedGroup]);
      const expectUserGroups = (
        resource: { id: string; groups: Array<{ value: string; $ref: string }> } | undefined,
        userId: string,
        groups: Array<{ value: string; $ref: string }>,
      ) => {
        invariant(resource, `Expected user ${userId} to be present.`);
        expect(resource.id).toEqual(userId);
        expect(resource.groups).toHaveLength(groups.length);
        expect(resource.groups).toEqual(expect.arrayContaining(groups));
      };

      const firstUserResponse = await scim.getUser(firstUser.id);
      expectUserGroups(firstUserResponse.body, firstUser.id, firstUserGroups);

      const secondUserResponse = await scim.getUser(secondUser.id);
      expectUserGroups(secondUserResponse.body, secondUser.id, secondUserGroups);

      const usersResponse = await scim.listUsers();
      const usersResponseBody = usersResponse.body;
      expectUserGroups(
        usersResponseBody.Resources.find(resource => resource.id === firstUser.id),
        firstUser.id,
        firstUserGroups,
      );
      expectUserGroups(
        usersResponseBody.Resources.find(resource => resource.id === secondUser.id),
        secondUser.id,
        secondUserGroups,
      );

      const firstFilteredUsersResponse = await scim.listUsers({
        filter: 'externalId eq "first-grouped-user"',
      });

      expect(firstFilteredUsersResponse.body.Resources).toHaveLength(1);
      expectUserGroups(firstFilteredUsersResponse.body.Resources[0], firstUser.id, firstUserGroups);

      const secondFilteredUsersResponse = await scim.listUsers({
        filter: 'externalId eq "second-grouped-user"',
      });
      expect(secondFilteredUsersResponse.body.Resources).toHaveLength(1);
      expectUserGroups(
        secondFilteredUsersResponse.body.Resources[0],
        secondUser.id,
        secondUserGroups,
      );
    });

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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userC',
        userName: 'User C',
        emails: [{ primary: true, type: 'work', value: 'user-c@' + domain }],
      });

      let users = await scim.listUsers();
      const initialBody = users.body;
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

      users = await scim.listUsers({
        count: '1',
      });
      let body = users.body;

      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
      });
      expect(body.Resources[0]).toEqual(initialBody.Resources[0]);

      users = await scim.listUsers({
        count: '2',
      });
      body = users.body;
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 2,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
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

      users = await scim.listUsers({
        startIndex: '2',
      });
      body = users.body;
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 2,
        startIndex: 2,
        totalResults: 3,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'userB',
          userName: 'User B',
        }),
      );

      users = await scim.listUsers({
        startIndex: '3',
      });
      body = users.body;
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 1,
        startIndex: 3,
        totalResults: 3,
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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      let response = await scim.listUsers({
        filter: 'userName eq "User A"',
      });
      let body = response.body;
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

      response = await scim.listUsers({
        filter: 'userName eq "User B"',
      });
      body = response.body;
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

      response = await scim.listUsers({
        filter: 'userName eq "User C"',
      });
      body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userA',
        userName: 'User A',
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await scim.createUser({
        ...newUserValues(),
        externalId: 'userB',
        userName: 'User B',
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      let response = await scim.listUsers({
        filter: 'externalId eq "userA"',
      });
      let body = response.body;
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

      response = await scim.listUsers({
        filter: 'externalId eq "userB"',
      });
      body = response.body;
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

      response = await scim.listUsers({
        filter: 'externalId eq "userC"',
      });
      body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });
      const userA = await scim
        .createUser({
          ...newUserValues(),
          externalId: 'userA',
          userName: 'User A',
          emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
        })
        .then(r => r.body);
      const userB = await scim
        .createUser({
          ...newUserValues(),
          externalId: 'userB',
          userName: 'User B',
          emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
        })
        .then(r => r.body);
      let response = await scim.listUsers({
        filter: `id eq "${userA.id}"`,
      });
      let body = response.body;
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

      response = await scim.listUsers({
        filter: `id eq "${userB.id}"`,
      });
      body = response.body;
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

      const groupResponse = await scim.listGroups({
        filter: `id eq "${crypto.randomUUID()}"`,
      });
      const groupBody = groupResponse.body;
      expect(groupBody).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 0,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 0,
      });
      expect(groupBody.Resources).toHaveLength(0);
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
      const scim = createScimTestkit({ baseUrl, headers });
      let response = await scim.listUsers({
        filter: 'id eq "asdasd "',
      });
      let body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      const postResponseBody = postResponse.body;
      expect(postResponseBody).toEqual({
        displayName: 'foobars',
        id: expect.any(String),
        meta: {
          resourceType: 'Group',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Groups/' + postResponseBody.id,
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
        const scim = createScimTestkit({ baseUrl, headers });

        const postResponse = await scim.createGroup({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'myExternalId',
        });
        const postResponseBody = postResponse.body;
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
      const scim = createScimTestkit({ baseUrl, headers });

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'myExternalId',
      });
      const conflictPostResponse = await scim.createGroup(
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
          externalId: 'foobars',
        },
        { expectedStatus: 409 },
      );
      expect(conflictPostResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'myExternalId',
      });
      const conflictPostResponse = await scim.createGroup(
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars1',
          members: [],
          externalId: 'myExternalId',
        },
        { expectedStatus: 409 },
      );
      expect(conflictPostResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      const putResponse = await scim.updateGroup(
        crypto.randomUUID(),
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        },
        { expectedStatus: 404 },
      );
      expect(putResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      const postResponseBody = postResponse.body;
      const putResponse = await scim.updateGroup(postResponseBody.id, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'iliketurtles',
        members: [],
      });
      expect(putResponse.body).toMatchObject({
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
      const scim = createScimTestkit({ baseUrl, headers });

      const putResponse = await scim.patchGroup(
        crypto.randomUUID(),
        {
          Operations: [
            {
              op: 'replace',
              path: 'displayName',
              value: 'ay',
            },
          ],
        },
        { expectedStatus: 404 },
      );
      expect(putResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      const postResponseBody = postResponse.body;

      const putResponse = await scim.patchGroup(postResponseBody.id, {
        Operations: [
          {
            op: 'replace',
            path: 'displayName',
            value: 'ay',
          },
        ],
      });
      const putResponseBody = putResponse.body;
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        displayName: 'ay',
        meta: {
          ...postResponseBody.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      const postResponseBody = postResponse.body;

      const putResponse = await scim.patchGroup(postResponseBody.id, {
        Operations: [
          {
            op: 'replace',
            value: {
              displayName: 'ay',
            },
          },
        ],
      });
      const putResponseBody = putResponse.body;
      expect(putResponseBody).toEqual({
        ...postResponseBody,
        displayName: 'ay',
        meta: {
          ...postResponseBody.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'my-external-id',
      });
      const postResponseBody = postResponse.body;

      const otherPostResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars1',
        members: [],
        externalId: 'newExternalId',
      });

      const putResponse = await scim.patchGroup(
        postResponseBody.id,
        {
          Operations: [
            {
              op: 'replace',
              value: {
                displayName: 'foobars1',
              },
            },
          ],
        },
        { expectedStatus: 409 },
      );
      expect(putResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'my-external-id',
      });
      const postResponseBody = postResponse.body;

      const putResponse = await scim.patchGroup(postResponseBody.id, {
        Operations: [
          {
            op: 'replace',
            path: 'externalId',
            value: 'newExternalId',
          },
        ],
      });
      expect(putResponse.body).toEqual({
        ...postResponseBody,
        externalId: 'newExternalId',
        meta: {
          ...postResponseBody.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'my-external-id',
      });
      const putResponse = await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'replace',
            value: {
              externalId: 'newExternalId',
            },
          },
        ],
      });
      const putResponseBody = putResponse.body;
      expect(putResponseBody).toEqual({
        ...postResponse.body,
        externalId: 'newExternalId',
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
        externalId: 'my-external-id',
      });
      const postResponseBody = postResponse.body;

      await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars1',
        members: [],
        externalId: 'newExternalId',
      });

      const putResponse = await scim.patchGroup(
        postResponseBody.id,
        {
          Operations: [
            {
              op: 'replace',
              value: {
                externalId: 'newExternalId',
              },
            },
          ],
        },
        { expectedStatus: 409 },
      );
      expect(putResponse.body).toMatchInlineSnapshot(`
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
      const scim = createScimTestkit({ baseUrl, headers });

      // create group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      // create user

      const usersPostResponse = await scim.createUser({
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
      });
      const putResponse = await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'add',
            path: 'members',
            value: [{ value: usersPostResponse.body.id }],
          },
        ],
      });
      expect(putResponse.body).toEqual({
        displayName: 'foobars',
        id: postResponse.body.id,
        members: [
          {
            $ref: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
            value: usersPostResponse.body.id,
          },
        ],
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
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
      const scim = createScimTestkit({ baseUrl, headers });

      // create group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      // create users

      const firstUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      const secondUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      const putResponse = await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'add',
            path: 'members',
            value: [{ value: firstUsersPostResponse.body.id }],
          },
          {
            op: 'add',
            path: 'members',
            value: [{ value: secondUsersPostResponse.body.id }],
          },
        ],
      });
      expect(putResponse.body).toEqual({
        displayName: 'foobars',
        id: postResponse.body.id,
        members: expect.arrayContaining([
          {
            $ref: baseUrl + '/scim/v2/Users/' + firstUsersPostResponse.body.id,
            value: firstUsersPostResponse.body.id,
          },
          {
            $ref: baseUrl + '/scim/v2/Users/' + secondUsersPostResponse.body.id,
            value: secondUsersPostResponse.body.id,
          },
        ]),
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
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
      const scim = createScimTestkit({ baseUrl, headers });

      // create group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      // create users

      const firstUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      const secondUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-b@' + domain }],
      });

      await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'add',
            path: 'members',
            value: [{ value: firstUsersPostResponse.body.id }],
          },
          {
            op: 'add',
            path: 'members',
            value: [{ value: secondUsersPostResponse.body.id }],
          },
        ],
      });

      const removeMembersPutResponse = await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'remove',
            path: `members[value eq "${firstUsersPostResponse.body.id}"]`,
          },
        ],
      });

      expect(removeMembersPutResponse.body).toEqual({
        displayName: 'foobars',
        id: postResponse.body.id,
        members: [
          {
            $ref: baseUrl + '/scim/v2/Users/' + secondUsersPostResponse.body.id,
            value: secondUsersPostResponse.body.id,
          },
        ],
        meta: {
          resourceType: 'Group',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Groups/' + postResponse.body.id,
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
      const scim = createScimTestkit({ baseUrl, headers });

      // create group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });

      // create users

      const firstUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      const secondUsersPostResponse = await scim.createUser({
        ...newUserValues(),
        emails: [{ primary: true, type: 'work', value: 'user-a@' + domain }],
      });
      await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'add',
            path: 'members',
            value: [{ value: firstUsersPostResponse.body.id }],
          },
          {
            op: 'add',
            path: 'members',
            value: [{ value: secondUsersPostResponse.body.id }],
          },
        ],
      });

      const removeMembersPutResponse = await scim.patchGroup(postResponse.body.id, {
        Operations: [
          {
            op: 'remove',
            path: `members[value eq "${firstUsersPostResponse.body.id}"]`,
          },
          {
            op: 'remove',
            path: `members[value eq "${secondUsersPostResponse.body.id}"]`,
          },
        ],
      });

      expect(removeMembersPutResponse.body).toEqual({
        displayName: 'foobars',
        id: postResponse.body.id,
        members: [],
        meta: {
          resourceType: 'Group',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: baseUrl + '/scim/v2/Groups/' + postResponse.body.id,
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
        const scim = createScimTestkit({ baseUrl, headers });

        await scim.deleteGroup(crypto.randomUUID(), { expectedStatus: 404 });
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
      const scim = createScimTestkit({ baseUrl, headers });

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      await scim.deleteGroup(postResponse.body.id);
      await scim.getGroup(postResponse.body.id, { expectedStatus: 404 });
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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupB',
        displayName: 'Group B',
      });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupC',
        displayName: 'Group C',
      });

      let groups = await scim.listGroups();
      const initialBody = groups.body;
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

      groups = await scim.listGroups({
        count: '1',
      });
      let body = groups.body;

      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 1,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
      });
      expect(body.Resources[0]).toEqual(initialBody.Resources[0]);

      groups = await scim.listGroups({
        count: '2',
      });
      body = groups.body;
      expect(body).toEqual({
        Resources: expect.any(Array),
        itemsPerPage: 2,
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        startIndex: 1,
        totalResults: 3,
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

      groups = await scim.listGroups({
        startIndex: '2',
      });
      body = groups.body;
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 2,
        startIndex: 2,
        totalResults: 3,
      });
      expect(initialBody.Resources).toContainEqual(
        expect.objectContaining({
          externalId: 'groupB',
          displayName: 'Group B',
        }),
      );

      groups = await scim.listGroups({
        startIndex: '3',
      });
      body = groups.body;
      expect(body).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        Resources: expect.any(Array),
        itemsPerPage: 1,
        startIndex: 3,
        totalResults: 3,
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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupB',
        displayName: 'Group B',
      });

      let response = await scim.listGroups({
        filter: 'displayName eq "Group A"',
      });
      let body = response.body;
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

      response = await scim.listGroups({
        filter: 'displayName eq "Group B"',
      });
      body = response.body;
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

      response = await scim.listGroups({
        filter: 'displayName eq "Group C"',
      });
      body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupA',
        displayName: 'Group A',
      });
      await scim.createGroup({
        ...newGroupValues(),
        externalId: 'groupB',
        displayName: 'Group B',
      });

      let response = await scim.listGroups({
        filter: 'externalId eq "groupA"',
      });
      let body = response.body;
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

      response = await scim.listGroups({
        filter: 'externalId eq "groupB"',
      });
      body = response.body;
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

      response = await scim.listGroups({
        filter: 'externalId eq "groupC"',
      });
      body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });
      const groupA = await scim
        .createGroup({
          ...newGroupValues(),
          externalId: 'groupA',
          displayName: 'Group A',
        })
        .then(r => r.body);
      const groupB = await scim
        .createGroup({
          ...newGroupValues(),
          externalId: 'groupB',
          displayName: 'Group B',
        })
        .then(r => r.body);

      let response = await scim.listGroups({
        filter: `id eq "${groupA.id}"`,
      });
      let body = response.body;
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

      response = await scim.listGroups({
        filter: `id eq "${groupB.id}"`,
      });
      body = response.body;
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

      response = await scim.listGroups({
        filter: `externalId eq "${crypto.randomUUID()}"`,
      });
      body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });
      let response = await scim.listGroups({
        filter: 'id eq "asdasd "',
      });
      let body = response.body;
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      expect(postResponse.body).toMatchObject({
        displayName: 'foobars',
        id: expect.any(String),
        meta: {
          resourceType: 'Group',
        },
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      });

      // after provisioning it seems to verify whether the group exists or not

      const getResponse = await scim.getGroup(postResponse.body.id);
      expect(getResponse.body).toMatchObject({
        ...postResponse.body,
        // Should be identical; but also has the empty members property
        members: [],
      });

      // then after the verification and lookup okta also sends a PUT...

      const putResponse = await scim.updateGroup(postResponse.body.id, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });
      expect(putResponse.body).toMatchObject({
        ...postResponse.body,
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });

      const externalUserId = '00u13w8ptpbdysgOl698';

      const usersPostResponse = await scim.createUser({
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
      });
      expect(usersPostResponse.body).toEqual({
        emails: [
          {
            primary: true,
            type: 'work',
            value: 'marty.mcfly@' + domain,
          },
        ],
        externalId: externalUserId,
        id: expect.any(String),
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'marty.mcfly@' + domain,
        active: true,
        groups: [],
        meta: {
          resourceType: 'User',
          created: expect.any(String),
          lastModified: expect.any(String),
          location: expect.stringContaining(baseUrl + '/scim/v2/Users/'),
        },
      });

      const putResponse = await scim.updateGroup(postResponse.body.id, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [{ value: usersPostResponse.body.id, display: null }],
      });
      expect(putResponse.body).toMatchObject({
        ...postResponse.body,
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
        },
        // Should be identical; but also has the empty members property
        members: [
          {
            $ref: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
            value: usersPostResponse.body.id,
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
        const scim = createScimTestkit({ baseUrl, headers });

        // create group

        const postResponse = await scim.createGroup({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [],
        });

        // create user

        const externalUserId = '00u13w8ptpbdysgOl698';

        const usersPostResponse = await scim.createUser({
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
        });

        const putGroupResponse = await scim.updateGroup(postResponse.body.id, {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'foobars',
          members: [{ value: usersPostResponse.body.id, display: null }],
        });

        // on okta we now remove the user from the group

        const putUserResponse = await scim.updateUser(usersPostResponse.body.id, {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          id: usersPostResponse.body.id,
          externalId: externalUserId,
          userName: 'marty.mcfly@' + domain,
          emails: [{ primary: true, type: 'work', value: 'marty.mcfly@' + domain }],
          meta: { resourceType: 'User' },
          active: false,
        });
        const putUserResponseBody = putUserResponse.body;

        expect(putUserResponseBody).toEqual({
          emails: [
            {
              primary: true,
              type: 'work',
              value: 'marty.mcfly@' + domain,
            },
          ],
          externalId: externalUserId,
          id: usersPostResponse.body.id,
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'marty.mcfly@' + domain,
          active: false,
          groups: [],
          meta: {
            resourceType: 'User',
            created: expect.any(String),
            lastModified: expect.any(String),
            location: baseUrl + '/scim/v2/Users/' + usersPostResponse.body.id,
          },
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
      const scim = createScimTestkit({ baseUrl, headers });

      // First Okta tries to provision the group

      const postResponse = await scim.createGroup({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'foobars',
        members: [],
      });

      // Okta uses a put request to update the display name
      // It also includes the whole "member" array, which is a bit annoying and expensive on our end as we cannot distinguish
      // whether this is a display name only update or whole member list update...

      const putResponse = await scim.updateGroup(postResponse.body.id, {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
        displayName: 'something else',
        members: [],
      });
      expect(putResponse.body).toMatchObject({
        ...postResponse.body,
        displayName: 'something else',
        // Should be identical; but also has the empty members property
        members: [],
        meta: {
          ...postResponse.body.meta,
          lastModified: expect.any(String),
        },
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
      const scim = createScimTestkit({ baseUrl, headers });

      const userResponse = await scim.createUser({
        ...newUserValues(),
        externalId: subOrExternalId,
        emails: [{ primary: true, type: 'work', value: email }],
      });
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
      const scim = createScimTestkit({ baseUrl, headers });

      const userResponse = await scim.createUser({
        ...newUserValues(),
        userName: 'userA',
        emails: [{ primary: true, type: 'work', value: 'emmett.brown@' + domain }],
      });

      // Now we gonna attempt to provision and take over the OIDC user
      // The important thing is that the userName is shared!

      const conflictUserResponse = await scim.createUser(
        {
          ...newUserValues(),
          userName: 'userA',
          externalId,
          emails: [{ primary: true, type: 'work', value: email }],
        },
        { expectedStatus: 409 },
      );
      expect(conflictUserResponse.body).toMatchInlineSnapshot(`
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
  const scim = createScimTestkit({ baseUrl, headers });
  await scim.createUser({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    userName: email,
    name: { givenName: 'Marty', familyName: 'McFly' },
    emails: [{ primary: true, value: email, type: 'work' }],
    locale: 'en-US',
    externalId: email,
    active: true,
  });

  authPayload = await oidcAuth.runGetAuthorizationUrl();
  signInUpResult = await oidcAuth.runSignInUp({
    state: authPayload.state,
  });
  invariant(signInUpResult.type === 'success', 'Expected sign in/up to succeed.');
});

test.concurrent(
  'organization admin can still sign in via non-oidc method even if login through the identity provider is enforced',
  async () => {
    const seed = initSeed();

    const domain =
      humanId({
        separator: '',
        capitalize: false,
      }) + '.local';

    const ownerEmail = 'admin@' + domain;

    const owner = await seed.createOwner(true, ownerEmail);
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    await oidcIntegration.registerFakeDomain(domain);
    await oidcIntegration.createMockServerAndUpdateIntegrationEndpoints({
      oidcForVerifiedDomainsRequired: true,
    });

    const response = await fetch(baseUrl + '/auth-api/signin', {
      method: 'POST',
      body: JSON.stringify({
        formFields: [
          { id: 'email', value: ownerEmail },
          { id: 'password', value: 'ilikebigturtlesandicannotlie47' },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toEqual(200);
    const body = z
      .object({
        status: z.string(),
        user: z.object({ emails: z.array(z.string()) }),
      })
      .parse(await response.json());
    expect(body).toMatchObject({
      status: 'OK',
      user: {
        emails: [ownerEmail],
      },
    });
  },
);

test.concurrent(
  'provisioned user leverages groups for deriving the users authorization',
  async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const oidc = await org.createOIDCIntegration();
    const oidcMock = await oidc.createMockServerAndUpdateIntegrationEndpoints();
    const domain = await oidc.registerFakeDomain();
    const accessToken = await org.createOrganizationAccessToken({
      permissions: ['member:describe', 'member:modify'],
      resources: { mode: ResourceAssignmentModeType.Granular },
    });
    const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

    const scimRequestHeaders = {
      'Content-Type': 'application/scim+json',
      Authorization: scimAuthHeader,
    };
    const scim = createScimTestkit({ baseUrl, headers: scimRequestHeaders });

    // create our user
    const email = 'demo@' + domain;
    const externalId = 'my-external-id';

    const createUserResponse = await scim.createUser({
      externalId,
      emails: [
        {
          primary: true,
          type: 'work',
          value: email,
        },
      ],
      userName: email,
    });
    const hiveUserId = createUserResponse.body.id;

    // create our group
    const createGroupResponse = await scim.createGroup({
      ...newGroupValues(),
      displayName: 'Test Group',
    });
    const groupId = createGroupResponse.body.id;

    // assign user to group
    const updateGroupResponse = await scim.updateGroup(groupId, {
      members: [{ value: hiveUserId }],
    });

    // create three projects so we can check whether the permissions apply
    const projects = [
      await org.createProject(),
      await org.createProject(),
      await org.createProject(),
    ] as const;

    // create a new role that only has access to the first project

    const createRoleResult = await createMemberRole(
      {
        name: 'Test Role',
        description: 'Bars',
        organization: { byId: org.organization.id },
        selectedPermissions: ['project:describe'],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    invariant(!!createRoleResult.createMemberRole.ok, 'create member role should have succeeded');

    // add the new role as a group mapping

    const addGroupMappingResult = await addGroupMappingToGroup(
      {
        groupId,
        assignedResources: {
          mode: ResourceAssignmentModeType.Granular,
          projects: [
            {
              projectId: projects[0].project.id,
              targets: {
                mode: ResourceAssignmentModeType.All,
              },
            },
          ],
        },
        roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    invariant(
      !!addGroupMappingResult.addGroupMappingToGroup.ok,
      'add group mapping should have succeeded',
    );

    oidcMock.setUser({
      email,
      userIdClaim: externalId,
    });

    let auth = await oidcMock.runGetAuthorizationUrl();
    const result = await oidcMock.runSignInUp({
      state: auth.state,
    });
    invariant(result.type === 'success', 'expected sign in to succeed');

    // fetch all the projects the user has access to
    let projectsResult = await org.projects(result.accessToken);
    expect(projectsResult.length).toEqual(1);

    // grant the group access to more resources
    const addGroupMappingToGroupResult2 = await addGroupMappingToGroup(
      {
        groupId,
        roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: {
          mode: ResourceAssignmentModeType.Granular,
          projects: [
            {
              projectId: projects[1].project.id,
              targets: {
                mode: ResourceAssignmentModeType.All,
              },
            },
          ],
        },
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    invariant(
      !!addGroupMappingToGroupResult2.addGroupMappingToGroup.ok,
      'expected group mapping update to succeed',
    );

    // fetch all the projects the user has access to
    projectsResult = await org.projects(result.accessToken);
    expect(projectsResult.length).toEqual(2);

    const addGroupMappingToGroupResult3 = await addGroupMappingToGroup(
      {
        groupId,
        roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: {
          mode: ResourceAssignmentModeType.All,
        },
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    invariant(
      !!addGroupMappingToGroupResult3.addGroupMappingToGroup.ok,
      'expected group mapping update to succeed',
    );

    // fetch all the projects the user has access to
    projectsResult = await org.projects(result.accessToken);
    expect(projectsResult.length).toEqual(3);
  },
);

test.concurrent('disabled user is revoked access', async ({ expect }) => {
  const seed = initSeed();
  const owner = await seed.createOwner();
  const org = await owner.createOrg();
  const oidc = await org.createOIDCIntegration();
  const oidcMock = await oidc.createMockServerAndUpdateIntegrationEndpoints();
  const domain = await oidc.registerFakeDomain();
  const accessToken = await org.createOrganizationAccessToken({
    permissions: ['member:describe', 'member:modify'],
    resources: { mode: ResourceAssignmentModeType.Granular },
  });
  const scimAuthHeader = 'Bearer ' + accessToken.privateAccessKey;

  const scimRequestHeaders = {
    'Content-Type': 'application/scim+json',
    Authorization: scimAuthHeader,
  };
  const scim = createScimTestkit({ baseUrl, headers: scimRequestHeaders });

  // create our user
  const email = 'demo@' + domain;
  const externalId = 'my-external-id';

  const createUserResponse = await scim.createUser({
    externalId,
    emails: [
      {
        primary: true,
        type: 'work',
        value: email,
      },
    ],
    userName: email,
  });
  const hiveUserId = createUserResponse.body.id;

  // create our group
  const createGroupResponse = await scim.createGroup({
    ...newGroupValues(),
    displayName: 'Test Group',
  });
  const groupId = createGroupResponse.body.id;

  // assign user to group
  await scim.updateGroup(groupId, {
    members: [{ value: hiveUserId }],
  });

  const createRoleResult = await createMemberRole(
    {
      name: 'Test Role',
      description: 'Bars',
      organization: { byId: org.organization.id },
      selectedPermissions: ['project:describe'],
    },
    owner.ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  invariant(!!createRoleResult.createMemberRole.ok, 'create member role should have succeeded');

  // add the new role as a group mapping
  const addGroupMappingResult = await addGroupMappingToGroup(
    {
      groupId,
      assignedResources: {
        mode: ResourceAssignmentModeType.All,
      },
      roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
    },
    owner.ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  invariant(
    !!addGroupMappingResult.addGroupMappingToGroup.ok,
    'add group mapping should have succeeded',
  );

  oidcMock.setUser({
    email,
    userIdClaim: externalId,
  });

  let auth = await oidcMock.runGetAuthorizationUrl();
  let result = await oidcMock.runSignInUp({
    state: auth.state,
  });
  invariant(result.type === 'success', 'expected sign in to succeed');

  // fetch all the projects the user has access to
  const projectsResult = await org.projects(result.accessToken);
  expect(projectsResult).toEqual([]);

  // disable the user
  await scim.updateUser(hiveUserId, {
    active: false,
  });

  // existing session is invalidated
  await expect(org.projects(result.accessToken)).rejects.toThrow(
    `No access (reason: \\"Missing permission for performing 'organization:describe' on resource\\")`,
  );

  auth = await oidcMock.runGetAuthorizationUrl();
  result = await oidcMock.runSignInUp({
    state: auth.state,
  });
  invariant(result.type === 'error', 'expected sign in to fail as the user was disabled');

  // reenable the user
  await scim.updateUser(hiveUserId, {
    active: true,
  });

  auth = await oidcMock.runGetAuthorizationUrl();
  result = await oidcMock.runSignInUp({
    state: auth.state,
  });
  invariant(result.type === 'success', 'expected sign in to fail as the user was disabled');
});
