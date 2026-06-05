import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Storage } from '@hive/api';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import { GroupStore, type Group } from '@hive/api/modules/organization/providers/group-store';
import { PostgresDatabasePool } from '@hive/postgres';
import { AuthN, UnauthenticatedSession } from '../../api/src/modules/auth/lib/authz';
import { Users, type User } from '../../api/src/modules/organization/providers/users';

const NameSchemaModel = z
  .object({
    familyName: z.string().optional(),
    givenName: z.string().optional(),
  })
  .strict()
  .optional();

const EmailSchemaModel = z
  .object({
    value: z.string().email(),
    type: z.string().optional(),
    primary: z.boolean().optional(),
  })
  .strict();

const GroupRefSchemaModel = z
  .object({
    value: z.string(), // group id
    $ref: z.string().url().optional(),
    display: z.string().optional(),
  })
  .strict();

const PatchOperationModel = z
  .object({
    op: z.enum(['add', 'replace', 'remove']),
    path: z.string().optional(),
    value: z.unknown().optional(),
  })
  .strict();

const PostUserBodyModel = z.object({
  userName: z.string().min(1),
  name: NameSchemaModel,
  displayName: z.string().optional(),
  title: z.string().optional(),
  userType: z.string().optional(),
  preferredLanguage: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
  emails: z.array(EmailSchemaModel).optional(),
  groups: z.array(GroupRefSchemaModel).optional(),
  externalId: z.string().optional(),
});

const PostUsersBodyModel = z.object({
  userName: z.string().min(1),
  name: NameSchemaModel,
  displayName: z.string().optional(),
  active: z.boolean().optional(),
  emails: z.array(EmailSchemaModel),
  groups: z.array(GroupRefSchemaModel).optional(),
  externalId: z.string(),
});

const PutUsersBodyModel = z.object({
  userName: z.string().optional(),
  active: z.boolean().optional(),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  emails: z
    .array(
      z.object({
        value: z.string().email(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
});

const PatchUserSchemaModel = z
  .object({
    schemas: z.literal('urn:ietf:params:scim:api:messages:2.0:PatchOp'),
    Operations: z.array(PatchOperationModel).min(1),
  })
  .strict();

const QuerySchemaModel = z.object({
  filter: z.string().optional(),
  startIndex: z
    .string()
    .transform(val => Number(val))
    .optional(),
  count: z
    .string()
    .transform(val => Number(val))
    .pipe(z.number().int())
    .optional(),
});

const SharedUserRouteParams = z.object({
  userId: z.string(),
});

export const createSCIMRouter =
  (authn: AuthN) => (server: FastifyInstance, pool: PostgresDatabasePool, storage: Storage) => {
    async function authenticateAuthorizeAndResolveOrganizationFromRequest(
      req: FastifyRequest,
      reply: FastifyReply,
    ) {
      // TODO: rate limit

      const session = await authn.authenticate({ req, reply });

      if (session instanceof UnauthenticatedSession) {
        req.log.debug('unauthenticated session');
        return {
          type: 'error' as const,
          error: createSCIMError({
            status: 400,
            detail: 'Missing access token.',
          }),
        };
      }

      const actor = await session.getActor();
      if (actor.type !== 'organizationAccessToken') {
        req.log.debug('invalid authentication type for scim endpoint. (type=%s)', actor.type);
        return {
          type: 'error' as const,
          error: createSCIMError({
            status: 400,
            detail: 'Invalid permissions for performing scim operations.',
          }),
        };
      }

      if (
        await session.canPerformAction({
          action: 'member:modify',
          organizationId: actor.organizationAccessToken.organizationId,
          params: {
            organizationId: actor.organizationAccessToken.organizationId,
          },
        })
      ) {
        req.log.debug('sufficient permissions for calling scim endpoint.');
        return {
          type: 'success' as const,
          organizationId: actor.organizationAccessToken.organizationId,
        };
      }
      req.log.debug('invalid permissions for calling scim endpoint.');
      return {
        type: 'error' as const,
        error: createSCIMError({
          status: 400,
          detail: 'Invalid permissions for performing scim operations.',
        }),
      };
    }

    server.post('/', (_, reply) => reply.status(200).send('Hive Console SCIM'));

    server.get('/Users/:userId', async (req, reply) => {
      const params = SharedUserRouteParams.parse(req.params);
      const auth = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (auth.type === 'error') {
        return reply.status(auth.error.status).send(auth.error);
      }

      const bodyParse = PostUserBodyModel.safeParse(req.body);
      if (bodyParse.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      const user = await new Users(pool).findUserProvisionedByOrganizationIdAndId(
        auth.organizationId,
        params.userId,
      );

      if (user === null) {
        return reply.status(404).send(
          createSCIMError({
            status: 404,
            detail: 'User does not exist.',
          }),
        );
      }

      return reply.code(200).send(createSCIMUserObjectFromUser(user));
    });

    server.post('/Users', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const bodyParse = PostUsersBodyModel.safeParse(req.body);
      if (bodyParse.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      const oidcIntegration = await storage.getOIDCIntegrationForOrganization({
        organizationId: result.organizationId,
      });

      if (!oidcIntegration) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Organization does not support provisioning users.',
          }),
        );
      }

      // TODO: these two should probably happen together in a transaction

      // TODO: OIDC Integration must exist !!!
      const supertokensUser = await new SuperTokensStore(pool, req.log).createOIDCUser({
        // TODO: double check if that is true
        sub: bodyParse.data.externalId,
        email: bodyParse.data.emails?.[0].value.toLowerCase() ?? '',
        oidcIntegrationId: oidcIntegration.id,
      });

      const user = await new Users(pool).createUser({
        email: supertokensUser.email,
        displayName: supertokensUser.email,
        fullName:
          (bodyParse.data.name?.givenName ?? '') + ' ' + (bodyParse.data.name?.familyName ?? ''),
        superTokensUserId: supertokensUser.userId,
        oidcIntegrationId: oidcIntegration.id,
        provisionedByOrganizationId: result.organizationId,
        externalId: bodyParse.data.externalId,
        isDisabled: (bodyParse.data.active ?? true) === false,
      });

      return reply.code(201).send(createSCIMUserObjectFromUser(user));
    });

    server.put('/Users/:userId', async (req, reply) => {
      const params = SharedUserRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const body = PutUsersBodyModel.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      let user = await new Users(pool).findUserProvisionedByOrganizationIdAndId(
        result.organizationId,
        params.userId,
      );

      if (!user) {
        return reply.code(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      // TODO:  update other properties like email display name etc etc

      if (body.data.active !== undefined) {
        if (user.deactivatedAt === null && !body.data.active) {
          user = await new Users(pool).disableUser(user.id);
        } else if (user.deactivatedAt !== null && body.data.active) {
          user = await new Users(pool).enabledUser(user.id);
        }
      }

      return reply.code(200).send(createSCIMUserObjectFromUser(user));
    });

    server.patch('/Users/:userId', async (req, reply) => {
      const params = SharedUserRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const body = PatchUserSchemaModel.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      let user = await new Users(pool).findUserProvisionedByOrganizationIdAndId(
        result.organizationId,
        params.userId,
      );

      if (!user) {
        return reply.code(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      for (const operation of body.data.Operations) {
        if (operation.op !== 'replace') {
          req.log.debug('unsupported operation received %s', operation.op);
          return reply.code(404).send(
            createSCIMError({
              detail: 'User does not exist.',
              status: 404,
            }),
          );
        }

        if (operation.path === 'active') {
          if (operation.value === true) {
            user = await new Users(pool).enabledUser(user.id);
          } else if (operation.value === false) {
            user = await new Users(pool).disableUser(user.id);
          } else {
            req.log.debug('invalid value provided %s', operation.value);
          }
        } else if (operation.path === 'email') {
          const emailResult = z.string().email().toLowerCase().safeParse(operation.value);
          if (emailResult.error) {
            return reply.code(400).send(
              createSCIMError({
                detail: 'Invalid email provided.',
                status: 400,
              }),
            );
          }
          // TODO: update the supertokens email and users email
        } else {
          req.log.debug('unsupported path %s', operation.path);
          return reply.code(404).send(
            createSCIMError({
              detail: 'User does not exist.',
              status: 404,
            }),
          );
        }
      }

      return reply.code(200).send(createSCIMUserObjectFromUser(user));
    });

    server.get('/Users', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const queryParse = QuerySchemaModel.safeParse(req.query);
      if (queryParse.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid query parameters provided.',
          }),
        );
      }

      const startIndex = queryParse.data.startIndex ?? 1;
      const count = queryParse.data.count ?? 100;

      const users: Array<SCIMUserObject> = [];

      if (queryParse.data.filter) {
        const [property, eqStr, rawValue] = queryParse.data.filter.split(' ');
        if (!property || eqStr !== 'eq' || !rawValue) {
          return reply.status(403).send(
            createSCIMError({
              status: 400,
              detail: 'Invalid filter provided.',
            }),
          );
        }
        const valueStr = rawValue.replaceAll('"', '');
        if (property === 'email') {
          const user = await new Users(pool).findUserProvisionedByOrganizationIdAndEmail(
            result.organizationId,
            valueStr,
          );
          if (user) {
            users.push(createSCIMUserObjectFromUser(user));
          }
        } else if (property === 'externalId') {
          // TODO: offset based pagination ond DB level instead of application level
          const user = await new Users(pool).findUserProvisionedByOrganizationIdAndExternalId(
            result.organizationId,
            valueStr,
          );
          if (user) {
            users.push(createSCIMUserObjectFromUser(user));
          }
        } else {
          req.log.info('unsupported filter property "%s"', property);
          return reply.status(403).send(
            createSCIMError({
              status: 400,
              detail: 'Unsupported filter provided.',
            }),
          );
        }
      } else {
        const offset = Math.max(0, startIndex - 1);

        const allUsers = await new Users(pool).getAllUsers(result.organizationId);
        const pagedUsers = allUsers.slice(offset, offset + count);
        for (const user of pagedUsers) {
          users.push(createSCIMUserObjectFromUser(user));
        }
      }

      return reply.code(200).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: users.length,
        startIndex,
        itemsPerPage: users.length,
        Resources: users,
      });
    });

    server.get('/Groups', async (req, reply) => {
      const groupStore = new GroupStore(req.log, pool);

      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const queryParse = QuerySchemaModel.safeParse(req.query);
      if (queryParse.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid query parameters provided.',
          }),
        );
      }

      const startIndex = queryParse.data.startIndex ?? 1;
      const count = queryParse.data.count ?? 100;

      const groups: Array<SCIMGroupObject> = [];

      if (queryParse.data.filter) {
        const [property, eqStr, rawValue] = queryParse.data.filter.split(' ');
        if (!property || eqStr !== 'eq' || !rawValue) {
          return reply.status(403).send(
            createSCIMError({
              status: 400,
              detail: 'Invalid filter provided.',
            }),
          );
        }
        const valueStr = rawValue.replaceAll('"', '');

        if (property === 'displayName') {
          const group = await groupStore.getGroupByOrganizationIdAndDisplayName(
            result.organizationId,
            valueStr,
          );
          if (group) {
            groups.push(createSCIMGroupObjectFromGroup(group));
          }
        } else if (property === 'id') {
          const group = await groupStore.getGroupByOrganizationIdAndGroupId(
            result.organizationId,
            valueStr,
          );
          if (group) {
            groups.push(createSCIMGroupObjectFromGroup(group));
          }
        } else if (property === 'externalId') {
          const group = await groupStore.getGroupByOrganizationIdAndExternalGroupId(
            result.organizationId,
            valueStr,
          );
          if (group) {
            groups.push(createSCIMGroupObjectFromGroup(group));
          }
        } else {
          req.log.info('unsupported filter property "%s"', property);
          return reply.status(400).send(
            createSCIMError({
              status: 400,
              detail: 'Unsupported filter provided.',
            }),
          );
        }
      } else {
        const allGroups = await groupStore.getAllGroupsForOrganizationId(result.organizationId);

        const offset = Math.max(0, startIndex - 1);

        const pagedGroups = allGroups.slice(offset, offset + count);
        for (const group of pagedGroups) {
          groups.push(createSCIMGroupObjectFromGroup(group));
        }
      }

      return reply.status(200).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: groups.length,
        startIndex,
        itemsPerPage: groups.length,
        Resources: groups,
      });
    });

    // server.post('/Groups', async (req, reply) => {});

    // server.put('/Groups/:groupId', async (req, reply) => {});

    // server.patch('/Groups/:groupId', async (req, reply) => {});

    // server.delete('/Groups/:groupId', async (req, reply) => {});
  };

function createSCIMError(args: { detail: string; status: number }) {
  return {
    ...args,
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
  };
}

type SCIMUserObject = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'];
  id: string;
  externalId: string;
  userName: string;
  name: {
    givenName: string;
    familyName: string;
  };
  emails: [
    {
      value: string;
      type: 'work';
      primary: true;
    },
  ];
  meta: {
    resourceType: 'User';
  };
};

function createSCIMUserObjectFromUser(user: User): SCIMUserObject {
  const [givenName = '', familyName = ''] = user.fullName.split(' ');

  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    externalId: user.externalId,
    userName: user.email,
    emails: [
      {
        primary: true,
        type: 'work',
        value: user.email,
      },
    ],
    name: {
      familyName,
      givenName,
    },
    meta: {
      resourceType: 'User',
    },
  };
}

type SCIMGroupObject = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  id: string;
  externalId?: string;
  displayName: string;
  members?: {
    value: string;
    display: string;
  }[];
  meta: {
    resourceType: 'Group';
  };
};

function createSCIMGroupObjectFromGroup(group: Group): SCIMGroupObject {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    externalId: group.externalGroupId ?? undefined,
    displayName: group.displayName,
    meta: {
      resourceType: 'Group',
    },
  };
}
