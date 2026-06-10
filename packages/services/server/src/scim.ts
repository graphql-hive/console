import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Logger, Storage } from '@hive/api';
import { AuthN, UnauthenticatedSession } from '@hive/api/modules/auth/lib/authz';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';
import {
  GroupMemberStore,
  type GroupMember,
} from '@hive/api/modules/organization/providers/group-member-store';
import { GroupStore, type Group } from '@hive/api/modules/organization/providers/group-store';
import { UsersStore, type User } from '@hive/api/modules/organization/providers/users-store';
import { RedisRateLimiter } from '@hive/api/modules/shared/providers/redis-rate-limiter';
import { PostgresDatabasePool } from '@hive/postgres';

const EmailSchemaModel = z
  .object({
    value: z.string().email(),
    type: z.string().optional(),
    primary: z.boolean().optional(),
  })
  .strict();

const PostUsersBodyModel = z.object({
  userName: z.string().min(1),
  active: z.boolean().optional(),
  emails: z.array(EmailSchemaModel),
  externalId: z.string(),
});

const PutUsersBodyModel = z.object({
  active: z.boolean().optional(),
  userName: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
  emails: z
    .array(
      z.object({
        value: z.string().toLowerCase().email(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
});

/**
 * - Entra sends capitalized...
 * - Okta sends lowercase...
 **/
const CaseInsensitiveRemoveOperationModel = z.string().toLowerCase().pipe(z.literal('remove'));
const CaseInsensitiveAddOperationModel = z.string().toLowerCase().pipe(z.literal('add'));
const CaseInsensitiveReplaceModel = z.string().toLowerCase().pipe(z.literal('replace'));

const PatchOperationModel = z
  .object({
    op: CaseInsensitiveReplaceModel,
    path: z.string().optional(),
    value: z.unknown().optional(),
  })
  .strict();

const PatchUserRequestBodyModel = z
  .object({
    Operations: z.array(PatchOperationModel).min(1),
  })
  .strict();

const QuerySchemaModel = z.object({
  filter: z.string().optional(),
  startIndex: z.coerce
    .number()
    .int()
    .min(1)
    .max(
      /** if someone has more users we can adjust. */
      10_000,
    )
    .optional()
    .default(1),
  count: z.coerce
    .number()
    .int()
    .min(0)
    .max(
      /** Most providers use 100, we are generous here. */
      1000,
    )
    .optional()
    .default(100),
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
  op: CaseInsensitiveAddOperationModel,
  path: z.literal('members'),
  value: z.array(GroupMemberSchema),
});

const RemoveOperationSchema = z
  .object({
    op: CaseInsensitiveRemoveOperationModel,
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
  z.object({
    op: CaseInsensitiveReplaceModel,
    path: z.undefined().optional(),
    value: z.object({
      displayName: z.string().optional(),
      externalId: z.string().optional(),
    }),
  }),
]);

const GroupPatchOperationSchema = z.union([
  AddOperationSchema,
  RemoveOperationSchema,
  ReplaceOperationSchema,
]);

const PatchGroupsRequestBodySchema = z.object({
  Operations: z.array(GroupPatchOperationSchema).min(1).max(100),
});

const GroupPutBodySchema = z.object({
  members: z.array(GroupMemberSchema).optional(),
  displayName: z.string().optional(),
  externalId: z.string().optional(),
});

export const createSCIMPlugin =
  (
    authn: AuthN,
    pool: PostgresDatabasePool,
    storage: Storage,
    rateLimiter: RedisRateLimiter,
  ): FastifyPluginAsync =>
  async server => {
    async function authenticateAuthorizeAndResolveOrganizationFromRequest(
      req: FastifyRequest,
      reply: FastifyReply,
    ) {
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

      if (await rateLimiter.isFastifyRouteRateLimited(req, 5 * 60, 1_000)) {
        return {
          type: 'error' as const,
          error: createSCIMError({
            status: 429,
            detail: 'Rate Limited.',
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

      req.log.debug(
        'sufficient permissions for calling scim endpoint. ' +
          req.routeOptions.method +
          '' +
          req.routeOptions.url,
      );

      const logger = req.log.child({
        organizationId: actor.organizationAccessToken.organizationId,
        oidcIntegrationId: oidcIntegration.id,
      });

      return {
        type: 'success' as const,
        organizationId: actor.organizationAccessToken.organizationId,
        oidcIntegration,
        logger,
      };
    }

    async function handleUserPropertyUpdates(
      logger: Logger,
      usersStore: UsersStore,
      supertokensStore: SuperTokensStore,
      organizationId: string,
      oidcIntegrationId: string,
      user: User,
      updates: z.TypeOf<typeof PutUsersBodyModel>,
    ) {
      if (updates.active !== undefined) {
        logger.debug('active changed');
        if (user.deactivatedAt === null && !updates.active) {
          user = await usersStore.disableUser(user.id);
        } else if (user.deactivatedAt !== null && updates.active) {
          user = await usersStore.enabledUser(user.id);
        }
      }

      const newEmail = updates.emails?.find(e => e.primary)?.value ?? null;

      if (newEmail !== null && newEmail !== user.email) {
        logger.debug('email changed');
        user = await pool.transaction('scim email update', async trx => {
          await supertokensStore.updateOIDCUserEmail(
            {
              userId: user.supertokenUserId,
              newEmail: newEmail,
            },
            trx,
          );
          const updatedUser = await usersStore.updateUserEmail(
            organizationId,
            user.id,
            newEmail,
            trx,
          );
          // invalidate session as email changed
          await supertokensStore.invalidateAllSessionsForUser(user.supertokenUserId, trx);
          return updatedUser;
        });
      }

      if (updates.externalId !== undefined && updates.externalId !== user.externalId) {
        logger.debug('external id changed');
        const newExternalId = updates.externalId;
        const updateUserExternalIdResult = await pool.transaction(
          'scim external id update',
          async trx => {
            await supertokensStore.updateOIDCUserSub(
              {
                oidcIntegrationId,
                sub: newExternalId,
                userId: user.supertokenUserId,
              },
              trx,
            );

            const result = await usersStore.updateExternalIdByOrganizationIdAndUserId(
              organizationId,
              user.id,
              newExternalId,
              trx,
            );

            if (result.type === 'success') {
              await supertokensStore.invalidateAllSessionsForUser(user.supertokenUserId, trx);
            }

            return result;
          },
        );

        if (updateUserExternalIdResult.type === 'error') {
          if (updateUserExternalIdResult.errorCode === 'notFound') {
            return {
              type: 'error' as const,
              error: createSCIMError({
                detail: 'User does not exist.',
                status: 404,
              }),
            };
          }
          if (updateUserExternalIdResult.errorCode === 'conflictOnExternalId') {
            return {
              type: 'error' as const,
              error: createSCIMError({
                detail: 'Another user with the same external id already exists.',
                status: 409,
              }),
            };
          }
          updateUserExternalIdResult satisfies never;
        }

        user = updateUserExternalIdResult.user;
      }

      if (updates.userName !== undefined && updates.userName !== user.displayName) {
        const result = await usersStore.updateUserDisplayNameByOrganizationIdAndUserId(
          organizationId,
          user.id,
          updates.userName,
        );
        if (result.type === 'error') {
          if (result.errorCode === 'notFound') {
            return {
              type: 'error' as const,
              error: createSCIMError({
                detail: 'User does not exist.',
                status: 404,
              }),
            };
          }
          if (result.errorCode === 'displayNameConflict') {
            return {
              type: 'error' as const,
              error: createSCIMError({
                detail: 'Another user with the same userName already exists.',
                status: 409,
              }),
            };
          }
          result satisfies never;
        }
        user = result.user;
      }

      return {
        type: 'success' as const,
        user,
      };
    }

    async function handleGroupPropertyUpdates(
      groupStore: GroupStore,
      group: Group,
      properties: {
        externalId?: string | null;
        displayName?: string | null;
      },
    ) {
      if (
        group.externalId === properties.externalId &&
        group.displayName === properties.displayName
      ) {
        return {
          type: 'success' as const,
          group,
        };
      }

      if (!group.externalId && !group.displayName) {
        return {
          type: 'success' as const,
          group,
        };
      }

      const result = await groupStore.updateGroupPropertiesByOrganizationIdAndGroupId(
        group.organizationId,
        group.id,
        {
          displayName: properties.displayName ?? null,
          externalId: properties.externalId ?? null,
        },
      );

      if (result.type === 'error') {
        if (result.errorCode === 'notFound') {
          return {
            type: 'error' as const,
            error: createSCIMError({
              detail: 'Group does not exist.',
              status: 404,
            }),
          };
        }
        if (result.errorCode === 'conflictOnDisplayName') {
          return {
            type: 'error' as const,
            error: createSCIMError({
              detail: 'Another group with the same display name already exists.',
              status: 409,
            }),
          };
        }

        if (result.errorCode === 'conflictOnExternalId') {
          return {
            type: 'error' as const,
            error: createSCIMError({
              detail: 'Another group with the same external id already exists.',
              status: 409,
            }),
          };
        }

        result satisfies never;
      }

      return {
        type: 'success' as const,
        group: result.group,
      };
    }

    server.addHook('preParsing', (request, _reply, _payload, done) => {
      // Okta Custom App Integrations send 'Content-Type: application/scim+json' with no body which causes fastify to raise an error.
      // In order to still support deletes, we have this code that will unset the content-type in this case :)
      if (
        request.method === 'DELETE' &&
        request.headers['content-type'] === 'application/scim+json' &&
        (request.headers['content-length'] === '0' || !request.headers['content-length'])
      ) {
        request.headers['content-type'] = undefined;
      }
      done();
    });

    server.addContentTypeParser(
      'application/scim+json',
      { parseAs: 'string' },
      server.getDefaultJsonParser('ignore', 'ignore'),
    );

    server.setErrorHandler(async (error, request, reply) => {
      request.log.error(error);
      return reply.status(500).send(
        createSCIMError({
          status: 500,
          detail: 'An unexpected error occured.',
        }),
      );
    });

    /**
     * General notes
     * - the route parameter (:userId; :groupId) is always the id column within our database
     * - external id is the ID on the providers id for a resource
     *   - Both Okta and Entra uses external id for users
     *   - Only Entra uses display name for group matching
     *   - Okta uses the display name for group matching
     *   - we still support external_id for groups though
     * - Okta distinguishes between OIN (Okta Integration network) and custom integrations. Currently Hive Console users can only do custom integrations (we did not apply for the OIN process).
     *   - Okta OIN and custom integrations use different ways for updating groups and members
     *   - Okta OIN uses PATCH wherever possible
     *   - Okta custom integrations uses exclusively uses PUT (which is more expensive on our end for updating user lists...)
     *   - More info here: https://developer.okta.com/docs/api/openapi/okta-scim/guides/scim-20
     */

    server.post('/', (_, reply) => reply.status(200).send('Hive Console SCIM'));

    /**
     * This route is used for looking up a specific user
     */
    server.get('/Users/:userId', async (req, reply) => {
      const auth = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (auth.type === 'error') {
        return reply.status(auth.error.status).send(auth.error);
      }

      const params = SharedUserRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      const usersStore = new UsersStore(pool);
      const user = await usersStore.findUserProvisionedByOrganizationIdAndId(
        auth.organizationId,
        params.data.userId,
      );

      if (user === null) {
        return reply.status(404).send(
          createSCIMError({
            status: 404,
            detail: 'User does not exist.',
          }),
        );
      }

      return reply.status(200).send(createSCIMUserObjectFromUser(user));
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
      const supertokensStore = new SuperTokensStore(pool, result.logger);

      const existingUser = await usersStore.findUserProvisionedByOrganizationIdAndExternalId(
        result.organizationId,
        bodyParse.data.externalId,
      );

      if (existingUser) {
        return reply.status(409).send(
          createSCIMError({
            status: 409,
            detail: 'A user with the same external id already exists.',
          }),
        );
      }

      const email = bodyParse.data.emails
        ?.find(email => email.primary === true && email)
        ?.value.toLowerCase();

      if (!email) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'user is missing primary email address.',
          }),
        );
      }

      const createUserResult = await pool.transaction('scim user creation', async trx => {
        const supertokensUser = await supertokensStore.createOIDCUser(
          {
            sub: bodyParse.data.externalId,
            email,
            oidcIntegrationId: result.oidcIntegration.id,
          },
          trx,
        );

        return await usersStore.createUser(
          {
            email: supertokensUser.email,
            displayName: bodyParse.data.userName,
            fullName: supertokensUser.email,
            superTokensUserId: supertokensUser.userId,
            oidcIntegrationId: result.oidcIntegration.id,
            provisionedByOrganizationId: result.organizationId,
            externalId: bodyParse.data.externalId,
            isDisabled: (bodyParse.data.active ?? true) === false,
          },
          trx,
        );
      });

      if (createUserResult.type === 'error') {
        if (createUserResult.errorCode === 'displayNameConflict') {
          return reply.status(409).send(
            createSCIMError({
              detail: 'Another user with the same userName already exists.',
              status: 409,
            }),
          );
        }

        createUserResult satisfies never;
      }

      return reply.status(201).send(createSCIMUserObjectFromUser(createUserResult.user));
    });

    /**
     * This route is used for updating user properties
     * - active (disabled state)
     * - email
     * - externalId
     * - user name
     */
    server.put('/Users/:userId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedUserRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
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
      const supertokensStore = new SuperTokensStore(pool, result.logger);

      let user = await usersStore.findUserProvisionedByOrganizationIdAndId(
        result.organizationId,
        params.data.userId,
      );

      if (!user) {
        result.logger.debug({ userId: params.data.userId }, 'user not found');
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      const logger = result.logger.child({ userId: user.id });
      logger.debug({ userId: user.id }, 'user found');

      const updateUserPropertyResult = await handleUserPropertyUpdates(
        logger,
        usersStore,
        supertokensStore,
        result.organizationId,
        result.oidcIntegration.id,
        user,
        body.data,
      );

      if (updateUserPropertyResult.type === 'error') {
        return reply
          .status(updateUserPropertyResult.error.status)
          .send(updateUserPropertyResult.error);
      }

      return reply.status(200).send(createSCIMUserObjectFromUser(updateUserPropertyResult.user));
    });

    /**
     * This route is used for updating user properties
     * - email
     * - active (disabled state)
     * - external id
     * - user name
     */
    server.patch('/Users/:userId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedUserRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
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
      const supertokensStore = new SuperTokensStore(pool, result.logger);
      let user = await usersStore.findUserProvisionedByOrganizationIdAndId(
        result.organizationId,
        params.data.userId,
      );

      if (!user) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      let changes: z.TypeOf<typeof PutUsersBodyModel> = {};
      let hasParseError = false;

      for (const operation of body.data.Operations) {
        if (operation.op !== 'replace') {
          result.logger.debug(
            'unsupported operation received. we aonly support replace for patch for now',
            operation.op,
          );
          continue;
        }

        // if no path is provided the value should contain the whole or partial user object,
        // which is identical to the body of the PUT request
        if (operation.path === undefined) {
          const body = PutUsersBodyModel.safeParse(operation.value);
          if (body.error) {
            hasParseError = true;
            break;
          }

          changes = body.data;
          continue;
        }

        if (operation.path === 'active') {
          const active = z.boolean().safeParse(operation.value);
          if (!active.success) {
            hasParseError = true;
            break;
          }
          changes.active = active.data;
          continue;
        }

        if (operation.path === 'userName') {
          const userName = z.string().safeParse(operation.value);
          if (!userName.success) {
            hasParseError = true;
            break;
          }
          changes.userName = userName.data;
          continue;
        }

        if (operation.path === 'emails') {
          const email = z.array(EmailSchemaModel).safeParse(operation.value);
          if (!email.success) {
            hasParseError = true;
            break;
          }
          changes.emails = email.data;
          continue;
        }

        if (operation.path === 'externalId') {
          const externalId = z.string().safeParse(operation.value);
          if (!externalId.success) {
            hasParseError = true;
            break;
          }
          changes.externalId = externalId.data;
          continue;
        }

        if (operation.path === 'emails[type eq "work"].value') {
          const email = z.string().email().safeParse(operation.value);
          if (!email.success) {
            hasParseError = true;
            break;
          }
          changes.emails = [
            {
              value: email.data,
              primary: true,
            },
          ];
          continue;
        }

        req.log.debug('unsupported path %s', operation.path);
      }

      if (hasParseError) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'User does not exist.',
            status: 404,
          }),
        );
      }

      const updateUserPropertyResult = await handleUserPropertyUpdates(
        req.log,
        usersStore,
        supertokensStore,
        result.organizationId,
        result.oidcIntegration.id,
        user,
        changes,
      );

      if (updateUserPropertyResult.type === 'error') {
        return reply
          .status(updateUserPropertyResult.error.status)
          .send(updateUserPropertyResult.error);
      }

      return reply.status(200).send(createSCIMUserObjectFromUser(updateUserPropertyResult.user));
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
        const filterParseResult = parseSCIMFilterExpression(queryParse.data.filter, [
          'userName',
          'externalId',
          'id',
        ]);
        if (filterParseResult.type === 'error') {
          return reply.status(400).send(result.error);
        }

        const { property, value } = filterParseResult;
        let user: User | null = null;

        switch (property) {
          case 'userName': {
            user = await usersStore.findUserProvisionedByOrganizationIdAndDisplayName(
              result.organizationId,
              value,
            );
            break;
          }
          case 'externalId': {
            user = await usersStore.findUserProvisionedByOrganizationIdAndExternalId(
              result.organizationId,
              value,
            );
            break;
          }
          case 'id': {
            if (!z.string().uuid().safeParse(value).success) {
              break;
            }
            user = await usersStore.findUserProvisionedByOrganizationIdAndId(
              result.organizationId,
              value,
            );
            break;
          }
        }

        if (user) {
          users.push(createSCIMUserObjectFromUser(user));
        }
      } else {
        const offset = Math.max(0, startIndex - 1);
        const pagedUsers = await usersStore.getOffsetPaginatedUsersForOrganizationId(
          result.organizationId,
          {
            offset,
            count,
          },
        );
        for (const user of pagedUsers) {
          users.push(createSCIMUserObjectFromUser(user));
        }
      }

      return reply.status(200).send({
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

      const groupStore = new GroupStore(result.logger, pool);

      const startIndex = queryParse.data.startIndex ?? 1;
      const count = queryParse.data.count ?? 100;

      const groups: Array<SCIMGroupObject> = [];

      if (queryParse.data.filter) {
        const filterParseResult = parseSCIMFilterExpression(queryParse.data.filter, [
          'displayName',
          'id',
          'externalId',
        ]);

        if (filterParseResult.type === 'error') {
          return reply.status(400).send(result.error);
        }

        const { property, value } = filterParseResult;
        let group: Group | null = null;

        switch (property) {
          case 'displayName': {
            group = await groupStore.getGroupByOrganizationIdAndDisplayName(
              result.organizationId,
              value,
            );
            break;
          }
          case 'id': {
            if (!z.string().uuid().safeParse(value).success) {
              break;
            }
            group = await groupStore.getGroupByOrganizationIdAndGroupId(
              result.organizationId,
              value,
            );
            break;
          }
          case 'externalId': {
            group = await groupStore.getGroupByOrganizationIdAndExternalGroupId(
              result.organizationId,
              value,
            );
            break;
          }
        }

        if (group) {
          groups.push(createSCIMGroupObjectFromGroup(group));
        }
      } else {
        const pagedGroups = await groupStore.getOffsetPaginatedGroupsForOrganizationId(
          result.organizationId,
          {
            offset: startIndex - 1,
            count,
          },
        );

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
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedGroupRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const groupStore = new GroupStore(result.logger, pool);

      const group = await groupStore.getGroupByOrganizationIdAndGroupId(
        result.organizationId,
        params.data.groupId,
      );

      if (!group) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const groupMemberStore = new GroupMemberStore(result.logger, pool);

      const groupMembers = await groupMemberStore.getGroupMembersForOrganizationIdAndGroupId(
        result.organizationId,
        group.id,
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

      const groupStore = new GroupStore(result.logger, pool);

      const createGroupResult = await groupStore.createGroup({
        organizationId: result.organizationId,
        displayName: body.data.displayName,
        externalId: body.data.externalId ?? null,
      });

      if (createGroupResult.type === 'error') {
        if (createGroupResult.errorCode === 'displayNameConflict') {
          return reply.status(409).send(
            createSCIMError({
              status: 409,
              detail: 'A SCIM group with the same display name already exists.',
            }),
          );
        }

        if (createGroupResult.errorCode === 'externalIdConflict') {
          return reply.status(409).send(
            createSCIMError({
              status: 409,
              detail: 'A SCIM group with the same external id already exists.',
            }),
          );
        }

        createGroupResult satisfies never;
      }

      return reply.status(201).send(createSCIMGroupObjectFromGroup(createGroupResult.group));
    });

    /**
     * This route is not implemented as it is not needed.
     */
    server.put('/Groups/:groupId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedGroupRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const body = GroupPutBodySchema.safeParse(req.body);
      if (body.error) {
        return reply.status(403).send(
          createSCIMError({
            status: 403,
            detail: 'Invalid request body provided.',
          }),
        );
      }
      const groupStore = new GroupStore(reply.log, pool);
      let group = await groupStore.getGroupByOrganizationIdAndGroupId(
        result.organizationId,
        params.data.groupId,
      );

      if (!group) {
        return reply.status(404).send(
          createSCIMError({
            status: 404,
            detail: 'Group does not exist.',
          }),
        );
      }

      const updateGroupPropertiesResult = await handleGroupPropertyUpdates(groupStore, group, {
        externalId: body.data.externalId,
        displayName: body.data.displayName,
      });

      if (updateGroupPropertiesResult.type === 'error') {
        return reply
          .status(updateGroupPropertiesResult.error.status)
          .send(updateGroupPropertiesResult.error);
      }

      const groupMemberStore = new GroupMemberStore(reply.log, pool);
      const memberIds = body.data.members?.map(member => member.value);

      let groupMembers;

      if (Array.isArray(memberIds)) {
        await pool.transaction('scim replace members', async trx => {
          await groupMemberStore.removeAllGroupMembersFromGroupByOrganizationIdAndGroupId(
            result.organizationId,
            group.id,
            trx,
          );
          groupMembers = [];

          if (memberIds.length) {
            groupMembers = await groupMemberStore.addGroupMembersToGroupByOrganizationIdAndGroupId(
              result.organizationId,
              group.id,
              memberIds,
              trx,
            );
          }
        });
      }

      return reply
        .status(200)
        .send(createSCIMGroupObjectFromGroup(updateGroupPropertiesResult.group, groupMembers));
    });

    /**
     * This route is used for doing the following things:
     * - group memberships (add/remove users)
     * - properties of group (display name and external id)
     */
    server.patch('/Groups/:groupId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);

      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedGroupRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
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

      const groupStore = new GroupStore(result.logger, pool);

      let group = await groupStore.getGroupByOrganizationIdAndGroupId(
        result.organizationId,
        params.data.groupId,
      );

      if (!group) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
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
          if (operation.path) {
            if (operation.path === 'displayName') {
              newDisplayName = operation.value;
            }

            if (operation.path === 'externalId') {
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
          } else {
            if (operation.value.displayName) {
              newDisplayName = operation.value.displayName;
            }

            if (operation.value.externalId) {
              newExternalId = operation.value.externalId;
            }
            continue;
          }
        }
        operation satisfies never;
      }

      if (error) {
        return reply.status(error.status).send(error);
      }

      const updateGroupPropertiesResult = await handleGroupPropertyUpdates(groupStore, group, {
        externalId: newExternalId,
        displayName: newDisplayName,
      });

      if (updateGroupPropertiesResult.type === 'error') {
        return reply
          .status(updateGroupPropertiesResult.error.status)
          .send(updateGroupPropertiesResult.error);
      }

      const groupMemberStore = new GroupMemberStore(reply.log, pool);

      if (usersToRemove.size) {
        await groupMemberStore.removeGroupMembersFromGroupByOrganizationIdAndGroupId(
          result.organizationId,
          group.id,
          Array.from(usersToRemove),
        );
      }

      if (usersToAdd.size) {
        await groupMemberStore.addGroupMembersToGroupByOrganizationIdAndGroupId(
          result.organizationId,
          group.id,
          Array.from(usersToAdd),
        );
      }

      if (fullReplaceUserIds !== null) {
        await pool.transaction('scim replace members', async trx => {
          await groupMemberStore.removeAllGroupMembersFromGroupByOrganizationIdAndGroupId(
            result.organizationId,
            group.id,
            trx,
          );

          if (fullReplaceUserIds.size) {
            await groupMemberStore.addGroupMembersToGroupByOrganizationIdAndGroupId(
              result.organizationId,
              group.id,
              Array.from(fullReplaceUserIds),
              trx,
            );
          }
        });
      }

      const groupMembers = await groupMemberStore.getGroupMembersForOrganizationIdAndGroupId(
        result.organizationId,
        group.id,
      );

      return reply
        .status(200)
        .send(createSCIMGroupObjectFromGroup(updateGroupPropertiesResult.group, groupMembers));
    });

    /**
     * This route is used for deleting a group
     */
    server.delete('/Groups/:groupId', async (req, reply) => {
      const result = await authenticateAuthorizeAndResolveOrganizationFromRequest(req, reply);
      if (result.type === 'error') {
        return reply.status(result.error.status).send(result.error);
      }

      const params = SharedGroupRouteParams.safeParse(req.params);

      if (!params.success) {
        return reply.status(404).send(
          createSCIMError({
            detail: 'Group does not exist.',
            status: 404,
          }),
        );
      }

      const groupStore = new GroupStore(req.log, pool);

      const deleteGroupResult = await groupStore.deleteGroup({
        organizationId: result.organizationId,
        groupId: params.data.groupId,
      });

      if (deleteGroupResult.type === 'error') {
        if (deleteGroupResult.errorCode === 'notFound') {
          return reply.status(404).send(
            createSCIMError({
              detail: 'Group does not exist.',
              status: 404,
            }),
          );
        }

        deleteGroupResult satisfies never;
      }

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
  emails: [
    {
      value: string;
      type: 'work';
      primary: true;
    },
  ];
  active: boolean;
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
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    externalId: user.externalId,
    userName: user.displayName,
    emails: [
      {
        primary: true,
        type: 'work',
        value: user.email,
      },
    ],
    active: user.deactivatedAt === null,
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
    externalId: group.externalId ?? undefined,
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

type ArrayWithAtLeastOneItem = [string, ...string[]];

function enumerateList(items: ArrayWithAtLeastOneItem): string {
  if (items.length === 1) return `"${items[0]}"`;
  if (items.length === 2) return `"${items[0]}" and "${items[1]}"`;
  return (
    items
      .slice(0, -1)
      .map(item => `"${item}"`)
      .join(', ') + ` and "${items[items.length - 1]}"`
  );
}

function parseSCIMFilterExpression(filter: string, supportedProperties: ArrayWithAtLeastOneItem) {
  /** A filter looks like the following: 'value eq "user-123"'  */
  const [property, eqStr, ...rawValueParts] = filter.trim().split(' ');
  if (!property || !supportedProperties.includes(property) || eqStr !== 'eq') {
    return {
      type: 'error' as const,
      error: createSCIMError({
        status: 400,
        detail:
          'The filter expression is not supported.' +
          ` Only a single "eq" expression for properties ${enumerateList(supportedProperties)} is supported.`,
      }),
    };
  }

  const remainingStr = rawValueParts.join(' ');

  if (remainingStr[0] !== '"' || remainingStr[remainingStr.length - 1] !== '"') {
    return {
      type: 'error' as const,
      error: createSCIMError({
        status: 400,
        detail:
          'The filter expression is not supported.' +
          ` Only a single "eq" expression for properties ${enumerateList(supportedProperties)} is supported.`,
      }),
    };
  }
  const value = remainingStr.substring(1, remainingStr.length - 1);
  return {
    type: 'success' as const,
    property,
    value,
  };
}
