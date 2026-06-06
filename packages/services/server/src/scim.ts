import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Storage } from '@hive/api';
import { AuthN, UnauthenticatedSession } from '@hive/api/modules/auth/lib/authz';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import {
  GroupMemberStore,
  type GroupMember,
} from '@hive/api/modules/organization/providers/group-member-store';
import { GroupStore, type Group } from '@hive/api/modules/organization/providers/group-store';
import { UsersStore, type User } from '@hive/api/modules/organization/providers/users-store';
import { PostgresDatabasePool } from '@hive/postgres';

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

const PatchOperationModel = z
  .object({
    op: z.enum(['add', 'replace', 'remove']),
    path: z.string().optional(),
    value: z.unknown().optional(),
  })
  .strict();

const PostUsersBodyModel = z.object({
  userName: z.string().min(1),
  name: NameSchemaModel,
  displayName: z.string().optional(),
  active: z.boolean().optional(),
  emails: z.array(EmailSchemaModel),
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

const PatchUserRequestBodyModel = z
  .object({
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
  userId: z.string().uuid(),
});

const SharedGroupRouteParams = z.object({
  groupId: z.string(),
});

const PostGroupsBodyModel = z.object({
  displayName: z.string(),
  externalId: z.string().optional(),
});

const GroupMemberSchema = z.object({
  value: z.string().uuid(),
});

const AddOperationSchema = z.object({
  op: z.literal('add'),
  path: z.literal('members'),
  value: z.array(GroupMemberSchema),
});

const RemoveOperationSchema = z
  .object({
    op: z.literal('remove'),
    // e.g. members[value eq "user-123"]
    path: z
      .string()
      .regex(/^members\[value eq "([^"]+)"\]$/, 'Unsupported SCIM member removal path')
      .transform(path => {
        const [, userId] = path.match(/^members\[value eq "([^"]+)"\]$/)!;
        return userId;
      })
      .pipe(z.string().uuid()),
  })
  .transform(value => ({
    op: value.op,
    userId: value.path,
  }));

const ReplaceOperationSchema = z.union([
  z.object({
    op: z.literal('replace'),
    path: z.literal('displayName'),
    value: z.string(),
  }),
  z.object({
    op: z.literal('replace'),
    path: z.literal('members'),
    value: z.array(GroupMemberSchema),
  }),
  z.object({
    op: z.literal('replace'),
    path: z.literal('externalId'),
    value: z.string(),
  }),
]);

const GroupPatchOperationSchema = z.union([
  AddOperationSchema,
  RemoveOperationSchema,
  ReplaceOperationSchema,
]);

const PatchGroupsRequestBodySchema = z.object({
  Operations: z.array(GroupPatchOperationSchema).min(1),
});

export const createSCIMPlugin =
  (authn: AuthN, pool: PostgresDatabasePool, storage: Storage): FastifyPluginAsync =>
  async server => {
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
            status: 401,
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
            status: 401,
            detail: 'Invalid permissions for performing scim operations.',
          }),
        };
      }

      const canPerformAction = await session.canPerformAction({
        // TODO: there should probably a dedicated permission for this
        // member:provision or member:scim or scim:provision etc.
        action: 'member:modify',
        organizationId: actor.organizationAccessToken.organizationId,
        params: {
          organizationId: actor.organizationAccessToken.organizationId,
        },
      });

      if (!canPerformAction) {
        req.log.debug('invalid permissions for calling scim endpoint.');
        return {
          type: 'error' as const,
          error: createSCIMError({
            status: 401,
            detail: 'Invalid permissions for performing scim operations.',
          }),
        };
      }

      const oidcIntegration = await storage.getOIDCIntegrationForOrganization({
        organizationId: actor.organizationAccessToken.organizationId,
      });

      if (!oidcIntegration) {
        return {
          type: 'error' as const,
          error: createSCIMError({
            status: 401,
            detail: 'Invalid organization configuration. No OIDC provider is connected.',
          }),
        };
      }

      req.log.debug('sufficient permissions for calling scim endpoint.');

      return {
        type: 'success' as const,
        organizationId: actor.organizationAccessToken.organizationId,
        oidcIntegration,
      };
    }

    /**
     * General notes
     * - the route parameter (:userId; :groupId) is always the id column within our database
     * - external id is the ID on the providers id for a resource
     *   - Both Okta and Entra uses external id for users
     *   - Only Entra uses external id for groups
     *   - Okta uses the groups display name for matching
     */

    server.post('/', (_, reply) => reply.status(200).send('Hive Console SCIM'));

    /**
     * This route is used for looking up a specific user
     */
    server.get('/Users/:userId', async (req, reply) => {
      const params = SharedUserRouteParams.parse(req.params);
      const auth = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (auth.type === 'error') {
        return reply.status(auth.error.status).send(auth.error);
      }
      const usersStore = new UsersStore(pool);
      const user = await usersStore.findUserProvisionedByOrganizationIdAndId(
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

    /**
     * This route is used for provisioning new users on Hive Console
     */
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

      const usersStore = new UsersStore(pool);
      const supertokensStore = new SuperTokensStore(pool, req.log);
      // TODO: these two should probably happen together in a transaction

      const supertokensUser = await supertokensStore.createOIDCUser({
        // TODO:
        // For okta the external id is the sub of the OIDC provider
        // For entra this is not the case, here the sub is not stable and
        // we need to instead map the OIDC oid claim to the external id
        // because of that additional configuration is needed within the OIDC / SCIM
        // configuration for mapping which claim should be used to match the user
        sub: bodyParse.data.externalId,
        email: bodyParse.data.emails?.[0].value.toLowerCase() ?? '',
        oidcIntegrationId: result.oidcIntegration.id,
      });

      const user = await usersStore.createUser({
        email: supertokensUser.email,
        displayName: supertokensUser.email,
        fullName:
          (bodyParse.data.name?.givenName ?? '') + ' ' + (bodyParse.data.name?.familyName ?? ''),
        superTokensUserId: supertokensUser.userId,
        oidcIntegrationId: result.oidcIntegration.id,
        provisionedByOrganizationId: result.organizationId,
        externalId: bodyParse.data.externalId,
        isDisabled: (bodyParse.data.active ?? true) === false,
      });

      return reply.code(201).send(createSCIMUserObjectFromUser(user));
    });

    /**
     * This route is used for updating user properties
     * - active (disabled state)
     * - ??? (TBD)
     */
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
      const usersStore = new UsersStore(pool);
      let user = await usersStore.findUserProvisionedByOrganizationIdAndId(
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
          user = await usersStore.disableUser(user.id);
        } else if (user.deactivatedAt !== null && body.data.active) {
          user = await usersStore.enabledUser(user.id);
        }
      }

      return reply.code(200).send(createSCIMUserObjectFromUser(user));
    });

    /**
     * This route is used for updating user properties
     * - email
     * - active (disabled state)
     * - ??? (TBD)
     */
    server.patch('/Users/:userId', async (req, reply) => {
      const params = SharedUserRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const body = PatchUserRequestBodyModel.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      const usersStore = new UsersStore(pool);
      let user = await usersStore.findUserProvisionedByOrganizationIdAndId(
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
            user = await usersStore.enabledUser(user.id);
          } else if (operation.value === false) {
            user = await usersStore.disableUser(user.id);
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

    /**
     * This route is used for:
     * - retrieve a list of all available users
     * - lookup if a user already exists (via email, external id, or display name)
     */
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

      const usersStore = new UsersStore(pool);
      const users: Array<SCIMUserObject> = [];

      if (queryParse.data.filter) {
        /** A filter looks like the following: 'value eq "user-123"'  */
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
          const user = await usersStore.findUserProvisionedByOrganizationIdAndEmail(
            result.organizationId,
            valueStr,
          );
          if (user) {
            users.push(createSCIMUserObjectFromUser(user));
          }
        } else if (property === 'externalId') {
          const user = await usersStore.findUserProvisionedByOrganizationIdAndExternalId(
            result.organizationId,
            valueStr,
          );
          if (user) {
            users.push(createSCIMUserObjectFromUser(user));
          }
        } else if (property === 'id') {
          const user = await usersStore.findUserProvisionedByOrganizationIdAndExternalId(
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
        // TODO: offset based pagination ond DB level instead of application level
        const allUsers = await usersStore.getAllUsers(result.organizationId);
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
      } satisfies SCIMListResponseObject);
    });

    /**
     * This route is used for:
     * - retrieve a list of all available groups
     * - lookup if a specific group already exists (via external id, id, or display name)
     */
    server.get('/Groups', async (req, reply) => {
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

      const groupStore = new GroupStore(req.log, pool);

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
      } satisfies SCIMListResponseObject);
    });

    /**
     * This route is used for listing a group with all its members
     */
    server.get('/Groups/:groupId', async (req, reply) => {
      const params = SharedGroupRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const groupStore = new GroupStore(req.log, pool);

      const group = await groupStore.getGroupByOrganizationIdAndGroupId(
        result.organizationId,
        params.groupId,
      );

      if (!group) {
        return reply.code(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const groupMemberStore = new GroupMemberStore(req.log, pool);

      const groupMembers = await groupMemberStore.getGroupMembersForOrganizationIdAndGroupId(
        result.organizationId,
        params.groupId,
      );

      return reply.status(200).send(createSCIMGroupObjectFromGroup(group, groupMembers));
    });

    /**
     * This route is used for creating new groups
     */
    server.post('/Groups', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const body = PostGroupsBodyModel.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      const groupStore = new GroupStore(req.log, pool);

      // TODO: case when group already exists but is "disabled"
      // In this case we should probably just raise an error and the admin
      // has to first delete the group on Console side
      // Otherwise we might risk that the group users instantly get some permissions
      // that they might not be intended to get
      const group = await groupStore.createGroup({
        organizationId: result.organizationId,
        displayName: body.data.displayName,
        externalGroupId: body.data.externalId ?? null,
      });

      return reply.status(201).send(createSCIMGroupObjectFromGroup(group));
    });

    /**
     * This route is not implemented as it is not needed.
     */
    server.put('/Groups/:groupId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      return reply.status(501).send(
        createSCIMError({
          status: 501,
          detail: 'PUT on Group resources is not supported.',
        }),
      );
    });

    /**
     * This route is used for doing the following things:
     * - group memberships (add/remove users)
     * - properties of group (display name and external id)
     */
    server.patch('/Groups/:groupId', async (req, reply) => {
      const params = SharedGroupRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);

      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const groupStore = new GroupStore(req.log, pool);

      let group = await groupStore.getGroupByOrganizationIdAndGroupId(
        result.organizationId,
        params.groupId,
      );

      if (!group) {
        return reply.code(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const body = PatchGroupsRequestBodySchema.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      /**
       * We gather all the operations for removing and adding users here
       * and then execute them in a batch afterwards.
       *
       * We do not allow mixing a full group user replacement with removing and adding
       * individual users. In reality this does never happen.
       */
      const usersToRemove = new Set<string>();
      const usersToAdd = new Set<string>();
      let fullReplaceUserIds: null | Set<string> = null;

      let newDisplayName: string | null = null;
      let newExternalId: string | null = null;

      let error: SCIMError | null = null;

      for (const operation of body.data.Operations) {
        if (operation.op === 'add') {
          if (fullReplaceUserIds !== null) {
            error = createSCIMError({
              status: 400,
              detail:
                'Mixing adding members and replacing the full member list in the same request is not supported.',
            });
            break;
          }

          for (const record of operation.value) {
            usersToAdd.add(record.value);
          }
          continue;
        }

        if (operation.op === 'remove') {
          if (fullReplaceUserIds !== null) {
            error = createSCIMError({
              status: 400,
              detail:
                'Mixing adding members and replacing the full member list in the same request is not supported.',
            });
            break;
          }

          usersToRemove.add(operation.userId);
          continue;
        }

        if (operation.op === 'replace') {
          if (operation.path === 'displayName') {
            // TODO: validate value ???
            newDisplayName = operation.value;
          }

          if (operation.path === 'externalId') {
            // TODO: validate value ???
            newExternalId = operation.value;
            continue;
          }

          if (operation.path === 'members') {
            if (usersToAdd.size) {
              error = createSCIMError({
                status: 400,
                detail:
                  'Mixing adding members and replacing the full member list in the same request is not supported.',
              });
              break;
            }

            if (usersToRemove.size) {
              error = createSCIMError({
                status: 400,
                detail:
                  'Mixing removing members and replacing the full member list in the same request is not supported.',
              });
              break;
            }

            if (fullReplaceUserIds !== null) {
              error = createSCIMError({
                status: 400,
                detail: 'Replace members multiple times in same request is not supported.',
              });
              break;
            }

            fullReplaceUserIds = new Set(operation.value.map(record => record.value));
          }

          continue;
        }
        operation satisfies never;
      }

      if (error) {
        return reply.status(error.status).send(error);
      }

      if (newDisplayName || newExternalId) {
        group = await groupStore.updateGroupPropertiesByOrganizationIdAndGroupId(
          result.organizationId,
          params.groupId,
          {
            displayName: newDisplayName,
            externalId: newExternalId,
          },
        );

        if (!group) {
          return reply.code(404).send(
            createSCIMError({
              detail: 'Group does not exist.',
              status: 404,
            }),
          );
        }
      }

      const groupMemberStore = new GroupMemberStore(reply.log, pool);

      if (usersToRemove.size) {
        await groupMemberStore.removeGroupMembersFromGroupByOrganizationIdAndGroupId(
          result.organizationId,
          params.groupId,
          Array.from(usersToRemove),
        );
      }

      if (usersToAdd.size) {
        await groupMemberStore.addGroupMembersToGroupByOrganizationIdAndGroupId(
          result.organizationId,
          params.groupId,
          Array.from(usersToAdd),
        );
      }

      if (fullReplaceUserIds !== null) {
        await groupMemberStore.removeAllGroupMembersFromGroupByOrganizationIdAndGroupId(
          result.organizationId,
          params.groupId,
        );
        if (fullReplaceUserIds.size) {
          await groupMemberStore.addGroupMembersToGroupByOrganizationIdAndGroupId(
            result.organizationId,
            params.groupId,
            Array.from(fullReplaceUserIds),
          );
        }
      }

      const groupMembers = await groupMemberStore.getGroupMembersForOrganizationIdAndGroupId(
        result.organizationId,
        params.groupId,
      );

      return reply.status(200).send(createSCIMGroupObjectFromGroup(group, groupMembers));
    });

    /**
     * This route is used for deleting a group
     */
    server.delete('/Groups/:groupId', async (req, reply) => {
      const params = SharedGroupRouteParams.parse(req.params);
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const body = PostGroupsBodyModel.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }

      const groupStore = new GroupStore(req.log, pool);

      // We only soft-delete for now...
      await groupStore.disableGroup({
        organizationId: result.organizationId,
        groupId: params.groupId,
      });

      return reply.status(204).send();
    });
  };

function createSCIMError(args: { detail: string; status: number }) {
  return {
    ...args,
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
  };
}

type SCIMError = ReturnType<typeof createSCIMError>;

/**
 * Minimal Representation of a SCIM User object to support Okta and Entra.
 */
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

/**
 * Minimal Representation of a SCIM group object to support Okta and Entra.
 */
type SCIMGroupObject = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'];
  id: string;
  externalId?: string;
  displayName: string;
  members?: {
    value: string;
    $ref: string;
  }[];
  meta: {
    resourceType: 'Group';
  };
};

type SCIMListResponseObject = {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: SCIMGroupObject[] | SCIMUserObject[];
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

function createSCIMGroupObjectFromGroup(
  group: Group,
  /**
   * The members are optional as they do not need to be included within actions such as
   * "list all groups".
   *
   * Only when a specific group object is requested or updated we include the list of members
   * so the SCIM provider can see if a user is or is not a member of an organization.
   */
  members?: Array<GroupMember>,
): SCIMGroupObject {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    externalId: group.externalGroupId ?? undefined,
    displayName: group.displayName,
    members: members?.map(member => ({
      value: member.userId,
      $ref: `/Users/${member.userId}`,
    })),
    meta: {
      resourceType: 'Group',
    },
  };
}
