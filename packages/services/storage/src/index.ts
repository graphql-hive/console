import { update } from 'slonik-utilities';
import { z } from 'zod';
import type {
  Member,
  Organization,
  OrganizationInvitation,
  Project,
  Storage,
  Target,
} from '@hive/api';
import {
  CommonQueryMethods,
  createPostgresDatabasePool,
  Interceptor,
  PostgresDatabasePool,
  psql,
  SerializableValue,
  TaggedTemplateLiteralInvocation,
  UniqueIntegrityConstraintViolationError,
} from '@hive/postgres';
import type { SchemaCoordinatesDiffResult } from '../../api/src/modules/schema/providers/inspector';
import { createSDLHash, ProjectType } from '../../api/src/shared/entities';
import { batch, batchBy } from '../../api/src/shared/helpers';
import { type organizations } from './db';
import {
  AffectedAppDeployments,
  ConditionalBreakingChangeMetadata,
  ConditionalBreakingChangeMetadataModel,
  HiveSchemaChangeModel,
  InsertConditionalBreakingChangeMetadataModel,
  SchemaCheckModel,
  SchemaCompositionErrorModel,
  SchemaPolicyWarningModel,
  TargetBreadcrumbModel,
  type SchemaChangeType,
  type SchemaCheckApprovalMetadata,
  type SchemaCompositionError,
} from './schema-change-model';

export type { Interceptor };

export { createTokenStorage } from './tokens';
export type { tokens, schema_policy_resource } from './db/types';

const organizationGetStartedMapping: Record<
  Exclude<keyof Organization['getStarted'], 'id'>,
  keyof organizations
> = {
  creatingProject: 'get_started_creating_project',
  publishingSchema: 'get_started_publishing_schema',
  checkingSchema: 'get_started_checking_schema',
  invitingMembers: 'get_started_inviting_members',
  reportingOperations: 'get_started_reporting_operations',
  enablingUsageBasedBreakingChanges: 'get_started_usage_breaking',
};

export async function createStorage(
  connection: string,
  maximumPoolSize: number,
  additionalInterceptors?: Array<Interceptor>,
): Promise<Storage> {
  const pool = await createPostgresDatabasePool({
    connectionParameters: connection,
    maximumPoolSize,
    additionalInterceptors,
  });

  const shared = {
    async getUserBySuperTokenId(
      { superTokensUserId }: { superTokensUserId: string },
      connection: CommonQueryMethods,
    ) {
      const record = await connection.maybeOne(psql`/* getUserBySuperTokenId */
        SELECT
          ${userFields(psql`"users".`)}
        FROM
          "users"
        WHERE
          "users"."supertoken_user_id" = ${superTokensUserId}
        LIMIT 1
      `);

      if (!record) {
        return null;
      }

      return UserModel.parse(record);
    },
    getUserById: batchBy(
      (item: { id: string; connection: CommonQueryMethods }) => item.connection,
      async input => {
        const userIds = input.map(i => i.id);
        const records = await input[0].connection.any(psql`/* getUserById */
          SELECT
            ${userFields(psql`"users".`)}
          FROM
            "users"
          WHERE
            "users"."id" = ANY(${psql.array(userIds, 'uuid')})
        `);

        const mappings = new Map<string, UserType>();
        for (const record of records) {
          const user = UserModel.parse(record);
          mappings.set(user.id, user);
        }

        return userIds.map(async id => mappings.get(id) ?? null);
      },
    ),
    async createUser(
      {
        email,
        fullName,
        displayName,
        superTokensUserId,
        oidcIntegrationId,
      }: {
        email: string;
        fullName: string;
        displayName: string;
        superTokensUserId: string;
        oidcIntegrationId: string | null;
      },
      connection: CommonQueryMethods,
    ) {
      const { id } = await connection
        .maybeOne(
          psql`/* createUser */
            INSERT INTO users
              ("email", "full_name", "display_name", "supertoken_user_id", "oidc_integration_id")
            VALUES
              (${email}, ${fullName}, ${displayName}, ${superTokensUserId}, ${oidcIntegrationId})
            RETURNING id
          `,
        )
        .then(z.object({ id: z.string() }).parse);

      await connection.query(psql`
        INSERT INTO "users_linked_identities" ("user_id", "identity_id")
        VALUES (${id}, ${superTokensUserId})
      `);

      const user = await shared.getUserById({ id, connection });
      if (!user) {
        throw new Error('Something went wrong.');
      }

      return user;
    },
    async getOrganization(userId: string, connection: CommonQueryMethods) {
      return connection
        .maybeOne(
          psql`/* getOrganization */ SELECT ${organizationFields(psql``)} FROM organizations WHERE user_id = ${userId} AND type = ${'PERSONAL'} LIMIT 1`,
        )
        .then(OrganizationModel.nullable().parse);
    },
    async addOrganizationMemberViaOIDCIntegrationId(
      args: {
        oidcIntegrationId: string;
        userId: string;
        invitation: OrganizationInvitation | null;
      },
      connection: CommonQueryMethods,
    ) {
      const linkedOrganizationId = await connection
        .maybeOneFirst(
          psql`/* addOrganizationMemberViaOIDCIntegrationId */
          SELECT
            "linked_organization_id"
          FROM
            "oidc_integrations"
          WHERE
            "id" = ${args.oidcIntegrationId}
        `,
        )
        .then(z.string().nullable().parse);

      if (linkedOrganizationId === null) {
        return;
      }

      // Add user and assign role (either the invited role, custom default role, or Viewer)
      await connection.query(
        psql`/* addOrganizationMemberViaOIDCIntegrationId */
          INSERT INTO organization_member
            (organization_id, user_id, role_id, assigned_resources, created_at)
          VALUES
            (
              ${linkedOrganizationId},
              ${args.userId},
              (
                COALESCE(
                  ${args.invitation?.roleId ?? null},
                  (SELECT default_role_id FROM oidc_integrations
                    WHERE id = ${args.oidcIntegrationId}),
                  (SELECT id FROM organization_member_roles
                    WHERE organization_id = ${linkedOrganizationId} AND name = 'Viewer')
                )
              ),
              ${
                args.invitation?.assignedResources
                  ? psql.jsonb(args.invitation.assignedResources)
                  : psql`(SELECT default_assigned_resources FROM oidc_integrations
                      WHERE id = ${args.oidcIntegrationId})`
              },
              now()
            )
          ${args.invitation ? psql`` : psql`ON CONFLICT DO NOTHING`}
          RETURNING *
        `,
      );
    },
    async getOrganizationMemberRoleByName(
      args: {
        organizationId: string;
        roleName: string;
      },
      connection: CommonQueryMethods,
    ) {
      const roleId = await connection
        .oneFirst(
          psql`/* getOrganizationMemberRoleByName */
          SELECT
            "id"
          FROM
            "organization_member_roles"
          WHERE
            "organization_id" = ${args.organizationId}
            AND "name" = ${args.roleName}
          LIMIT 1
        `,
        )
        .then(z.string().parse);

      return roleId;
    },
  };

  function buildUserData(input: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    superTokensUserId: string;
    oidcIntegrationId: string | null;
  }) {
    const { firstName, lastName } = input;
    const name =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : input.email.split('@')[0].slice(0, 25).padEnd(2, '1');

    return {
      email: input.email,
      displayName: name,
      fullName: name,
      superTokensUserId: input.superTokensUserId,
      oidcIntegrationId: input.oidcIntegrationId,
    };
  }

  const storage: Storage = {
    destroy() {
      return pool.end();
    },
    async isReady() {
      try {
        await pool.exists(psql`/* Heartbeat */ SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
    async ensureUserExists({
      superTokensUserId,
      email,
      oidcIntegration,
      firstName,
      lastName,
    }: {
      superTokensUserId: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      oidcIntegration: null | {
        id: string;
      };
    }) {
      class EnsureUserExistsError extends Error {}

      try {
        return await pool.transaction('ensureUserExists', async t => {
          let action: 'created' | 'no_action' = 'no_action';

          // try searching existing user first
          let internalUser = await t
            .maybeOne(
              psql`
                SELECT
                  ${userFields(psql`"users".`)}
                FROM "users"
                WHERE
                  "users"."supertoken_user_id" = ${superTokensUserId}
                  OR EXISTS (
                    SELECT 1 FROM "users_linked_identities" "uli"
                    WHERE "uli"."user_id" = "users"."id"
                    AND "uli"."identity_id" = ${superTokensUserId}
                  )
              `,
            )
            .then(UserModel.nullable().parse);

          if (!internalUser) {
            // try automatic account linking
            const sameEmailUsers = await t
              .any(
                psql`/* ensureUserExists */
                  SELECT ${userFields(psql`"users".`)}
                  FROM "users"
                  WHERE "users"."email" = ${email}
                  ORDER BY "users"."created_at";
                `,
              )
              .then(users => users.map(user => UserModel.parse(user)));

            if (sameEmailUsers.length === 1) {
              internalUser = sameEmailUsers[0];
              await t.query(psql`
                INSERT INTO "users_linked_identities" ("user_id", "identity_id")
                VALUES (${internalUser.id}, ${superTokensUserId})
              `);
            }
          }

          let invitation: OrganizationInvitation | null = null;

          if (oidcIntegration?.id) {
            const oidcConfig = await this.getOIDCIntegrationById({
              oidcIntegrationId: oidcIntegration.id,
            });

            if (oidcConfig) {
              invitation = await t
                .maybeOne(
                  psql`
                    DELETE FROM "organization_invitations" AS "oi"
                    WHERE
                      "oi"."organization_id" = ${oidcConfig.linkedOrganizationId}
                      AND "oi"."email" = ${email}
                      AND "oi"."expires_at" > now()
                    RETURNING
                      "oi"."organization_id" "organizationId"
                      , "oi"."code" "code"
                      , "oi"."email" "email"
                      , to_json("oi"."created_at") "createdAt"
                      , to_json("oi"."expires_at") "expiresAt"
                      , "oi"."role_id" "roleId"
                      , "oi"."assigned_resources" "assignedResources"
                  `,
                )
                .then(OrganizationInvitationModel.nullable().parse);
            }

            if (oidcConfig?.requireInvitation && !invitation) {
              const member = internalUser
                ? await this.getOrganizationMember({
                    organizationId: oidcConfig.linkedOrganizationId,
                    userId: internalUser.id,
                  })
                : null;

              if (!member) {
                throw new EnsureUserExistsError('User is not invited to the organization.');
              }
            }
          }

          // either user is brand new or user is not linkable (multiple accounts with the same email exist)
          if (!internalUser) {
            internalUser = await shared.createUser(
              buildUserData({
                email,
                firstName,
                lastName,
                superTokensUserId,
                oidcIntegrationId: oidcIntegration?.id ?? null,
              }),
              t,
            );

            action = 'created';
          }

          if (internalUser.email !== email) {
            await t.query(psql`
              UPDATE "users"
              SET "email" = ${email}
              WHERE "id" = ${internalUser.id}
            `);
            internalUser.email = email;
          }

          if (oidcIntegration !== null) {
            // Add user to OIDC linked integration
            await shared.addOrganizationMemberViaOIDCIntegrationId(
              {
                oidcIntegrationId: oidcIntegration.id,
                userId: internalUser.id,
                invitation,
              },
              t,
            );
          }

          return {
            ok: true,
            user: internalUser,
            action,
          };
        });
      } catch (e) {
        if (e instanceof EnsureUserExistsError) {
          return {
            ok: false,
            reason: e.message,
          };
        }
        throw e;
      }
    },
    async getUserBySuperTokenId({ superTokensUserId }) {
      return shared.getUserBySuperTokenId({ superTokensUserId }, pool);
    },
    async getUserById({ id }) {
      return shared.getUserById({ id, connection: pool });
    },
    async updateUser({ id, displayName, fullName }) {
      await pool.query(psql`/* updateUser */
        UPDATE "users"
        SET
          "display_name" = ${displayName}
          , "full_name" = ${fullName}
        WHERE
          "id" = ${id}
      `);

      const user = await this.getUserById({ id });

      if (!user) {
        throw new Error('Something went wrong.');
      }

      return user;
    },
    createOrganization(input) {
      return pool.transaction('createOrganization', async t => {
        if (input.reservedSlugs.includes(input.slug)) {
          return {
            ok: false,
            message: 'Organization slug is reserved',
          };
        }

        const orgSlugExists = await t.exists(
          psql`/* orgSlugExists */ SELECT 1 FROM organizations WHERE clean_id = ${input.slug} LIMIT 1`,
        );

        if (orgSlugExists) {
          return {
            ok: false,
            message: 'Organization slug is already taken',
          };
        }

        const org = await t
          .maybeOne(
            psql`/* createOrganization */
            INSERT INTO organizations
              ("name", "clean_id", "user_id")
            VALUES
              (${input.slug}, ${input.slug}, ${input.userId})
            RETURNING ${organizationFields(psql``)}
          `,
          )
          .then(OrganizationModel.parse);

        // Create default roles for the organization
        const roles = await t
          .any(
            psql`/* createOrganizationRoles */
            INSERT INTO organization_member_roles
            (
              organization_id,
              name,
              description,
              locked
            )
            VALUES (
              ${org.id},
              'Admin',
              'Full access to all organization resources',
              true
            ), (
              ${org.id},
              'Viewer',
              'Read-only access to all organization resources',
              true
            )
            RETURNING id, name
          `,
          )
          .then(z.array(z.object({ id: z.string(), name: z.string() })).parse);

        const adminRole = roles.find(role => role.name === 'Admin');

        if (!adminRole) {
          throw new Error('Admin role not found');
        }

        // Assign the admin role to the user
        await t.query(
          psql`/* assignAdminRole */
            INSERT INTO organization_member
              ("organization_id", "user_id", "role_id", "created_at")
            VALUES
              (${org.id}, ${input.userId}, ${adminRole.id}, now())
          `,
        );

        return {
          ok: true,
          organization: org,
        };
      });
    },
    async deleteOrganization({ organizationId: organization }) {
      const result = await pool.transaction('DeleteOrganization', async t => {
        const tokens = await t
          .any(
            psql`/* findTokensForDeletion */
            SELECT token FROM tokens WHERE organization_id = ${organization} AND deleted_at IS NULL
          `,
          )
          .then(z.array(z.object({ token: z.string() })).parse);

        return {
          organization: await t
            .maybeOne(
              psql`/* deleteOrganization */
                DELETE FROM organizations
                WHERE id = ${organization}
                RETURNING ${organizationFields(psql``)}
              `,
            )
            .then(OrganizationModel.parse),
          tokens: tokens.map(row => row.token),
        };
      });

      return {
        ...result.organization,
        tokens: result.tokens,
      };
    },
    async createProject({ organizationId: organization, slug, type }) {
      // Native Composition is enabled by default for fresh Federation-type projects
      return pool.transaction('createProject', async t => {
        const projectSlugExists = await t.exists(
          psql`/* projectSlugExists */ SELECT 1 FROM projects WHERE clean_id = ${slug} AND org_id = ${organization} LIMIT 1`,
        );

        if (projectSlugExists) {
          return {
            ok: false,
            message: 'Project slug is already taken',
          };
        }

        const project = await t
          .maybeOne(
            psql`/* createProject */
              INSERT INTO projects
                ("name", "clean_id", "type", "org_id", "native_federation")
              VALUES
                (${slug}, ${slug}, ${type}, ${organization}, ${type === ProjectType.FEDERATION})
              RETURNING ${projectFields(psql``)}
            `,
          )
          .then(ProjectModel.parse);

        return {
          ok: true,
          project,
        };
      });
    },
    async getOrganizationId({ organizationSlug }) {
      // Based on clean_id, resolve id
      const result = await pool
        .maybeOne(
          psql`/* getOrganizationId */
            SELECT id FROM organizations WHERE clean_id = ${organizationSlug} LIMIT 1
          `,
        )
        .then(z.object({ id: z.string() }).nullable().parse);

      if (!result) {
        return null;
      }

      return result.id;
    },
    getOrganizationOwnerId: batch(async selectors => {
      const organizations = selectors.map(s => s.organizationId);
      const owners = await pool
        .any(
          psql`/* getOrganizationOwnerId */
        SELECT id, user_id
        FROM organizations
        WHERE id IN (${psql.join(organizations, psql`, `)})`,
        )
        .then(z.array(OrganizationUserIdAndIdModel).parse);

      return organizations.map(async organization => {
        const owner = owners.find(row => row.id === organization);

        if (owner) {
          return owner.user_id;
        }

        return null;
      });
    }),
    getOrganizationOwner: batch(async selectors => {
      const organizations = selectors.map(s => s.organizationId);
      const owners = await pool.any(
        psql`/* getOrganizationOwner */
        SELECT
          ${userFields(psql`"u".`)},
          omr.scopes as scopes,
          om.organization_id AS "organizationId",
          om.connected_to_zendesk AS "connectedToZendesk",
          true AS "isOwner",
          omr.id as "roleId",
          omr.name as "roleName",
          omr.locked as "roleLocked",
          omr.scopes as "roleScopes",
          omr.description as "roleDescription"
        FROM organizations as o
        LEFT JOIN users as u ON (u.id = o.user_id)
        LEFT JOIN organization_member as om ON (om.user_id = u.id AND om.organization_id = o.id)
        LEFT JOIN organization_member_roles as omr ON (omr.organization_id = o.id AND omr.id = om.role_id)
        WHERE o.id = ANY(${psql.array(organizations, 'uuid')})`,
      );

      const parsedOwners = z.array(MemberModel).parse(owners);

      return organizations.map(organization => {
        const owner = parsedOwners.find(row => row.organization === organization);

        if (owner) {
          return Promise.resolve(owner);
        }

        return Promise.reject(new Error(`Owner not found (organization=${organization})`));
      });
    }),
    async countOrganizationMembers({ organizationId: organization }) {
      const { total } = await pool
        .maybeOne(
          psql`/* countOrganizationMembers */ SELECT COUNT(*) as total FROM organization_member WHERE organization_id = ${organization}`,
        )
        .then(z.object({ total: z.number() }).parse);

      return total;
    },
    getOrganizationMember: batch(async selectors => {
      const membersResult = await pool.any(
        psql`/* getOrganizationMember */
          SELECT
            ${userFields(psql`"u".`)},
            omr.scopes as scopes,
            om.organization_id AS "organizationId",
            om.connected_to_zendesk AS "connectedToZendesk",
            CASE WHEN o.user_id = om.user_id THEN true ELSE false END AS "isOwner",
            omr.id as "roleId",
            omr.name as "roleName",
            omr.locked as "roleLocked",
            omr.scopes as "roleScopes",
            omr.description as "roleDescription"
          FROM organization_member as om
          LEFT JOIN organizations as o ON (o.id = om.organization_id)
          LEFT JOIN users as u ON (u.id = om.user_id)
          LEFT JOIN organization_member_roles as omr ON (omr.organization_id = o.id AND omr.id = om.role_id)
          WHERE (om.organization_id, om.user_id) IN ((${psql.join(
            selectors.map(s => psql`${s.organizationId}, ${s.userId}`),
            psql`), (`,
          )}))
          ORDER BY u.created_at DESC
        `,
      );

      const parsedMembers = z.array(MemberModel).parse(membersResult);

      return selectors.map(selector => {
        const member = parsedMembers.find(
          row => row.organization === selector.organizationId && row.id === selector.userId,
        );

        if (member) {
          return Promise.resolve(member);
        }

        return Promise.resolve(null);
      });
    }),

    async getOrganizationInvitations(organizationId, args) {
      let cursor: null | {
        createdAt: string;
        /** email */
        hash: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 50) : 50) : 50;

      if (args.after) {
        cursor = decodeCreatedAtAndHashBasedCursor(args.after);
      }

      const query = psql`
        SELECT
          oi.organization_id AS "organizationId"
          , oi.code
          , oi.email
          , to_json(oi.created_at) as "createdAt"
          , to_json(oi.expires_at) as "expiresAt"
          , oi.role_id as "roleId"
          , oi.assigned_resources as "assignedResources"
        FROM
          organization_invitations as oi
        LEFT JOIN organization_member_roles as omr ON (omr.organization_id = oi.organization_id AND omr.id = oi.role_id)
        WHERE
          oi.organization_id = ${organizationId}
          ${
            cursor
              ? psql`
                  AND (
                    (
                      oi.created_at = ${cursor.createdAt}
                      AND oi.email < ${cursor.hash}
                    )
                    OR oi.created_at < ${cursor.createdAt}
                  )
                `
              : psql``
          }
          AND oi.expires_at > NOW()
        ORDER BY
          oi.created_at DESC
          , oi.email DESC
        LIMIT ${limit + 1}
      `;

      const result = await pool.any(query).then(z.array(OrganizationInvitationModel).parse);

      let edges = result.map(node => {
        return {
          node,
          get cursor() {
            return encodeCreatedAtAndHashBasedCursor({
              createdAt: node.createdAt,
              hash: node.email,
            });
          },
        };
      });

      const hasNextPage = edges.length > limit;
      edges = edges.slice(0, limit);

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return edges[edges.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return edges[0]?.cursor ?? '';
          },
        },
      };
    },

    async deleteOrganizationMemberRole({ organizationId, roleId }) {
      await pool.transaction('deleteOrganizationMemberRole', async t => {
        const viewerRoleId = await t
          .oneFirst(
            psql`/* getViewerRoleId */
          SELECT id FROM organization_member_roles
          WHERE organization_id = ${organizationId} AND locked = true AND name = 'Viewer'
          LIMIT 1
        `,
          )
          .then(z.string().parse);

        // move all invitations to the viewer role
        await t.query(psql`/* moveInvitations */
          UPDATE organization_invitations
          SET role_id = ${viewerRoleId}
          WHERE role_id = ${roleId} AND organization_id = ${organizationId}
        `);

        await t.query(psql`/* deleteOrganizationMemberRole */
          DELETE FROM organization_member_roles
          WHERE
            organization_id = ${organizationId}
            AND id = ${roleId}
            AND locked = false
            AND (
              SELECT count(*)
              FROM organization_member
              WHERE role_id = ${roleId} AND organization_id = ${organizationId}
              ) = 0
        `);
      });
    },
    async getOrganizationMemberAccessPairs(pairs) {
      const results = await pool
        .any(
          psql`/* getOrganizationMemberAccessPairs */
          SELECT om.organization_id, om.user_id, omr.scopes as scopes
          FROM organization_member as om
          LEFT JOIN organization_member_roles as omr ON (omr.organization_id = om.organization_id AND omr.id = om.role_id)
          WHERE (om.organization_id, om.user_id) IN ((${psql.join(
            pairs.map(p => psql`${p.organizationId}, ${p.userId}`),
            psql`), (`,
          )}))
        `,
        )
        .then(z.array(OrganizationMemberAccessModel).parse);

      return pairs.map(({ organizationId: organization, userId: user }) => {
        return (results.find(row => row.organization_id === organization && row.user_id === user)
          ?.scopes || []) as Member['scopes'];
      });
    },
    async updateOrganizationSlug({ slug, organizationId: organization, reservedSlugs }) {
      return pool.transaction('updateOrganizationSlug', async t => {
        if (reservedSlugs.includes(slug)) {
          return {
            ok: false,
            message: 'Provided organization slug is not allowed',
          };
        }

        const orgSlugExists = await t.exists(
          psql`/* orgSlugExists */ SELECT 1 FROM organizations WHERE clean_id = ${slug} AND id != ${organization} LIMIT 1`,
        );

        if (orgSlugExists) {
          return {
            ok: false,
            message: 'Organization slug is already taken',
          };
        }

        return {
          ok: true,
          organization: await t
            .maybeOne(
              psql`/* updateOrganizationSlug */
              UPDATE organizations
              SET clean_id = ${slug}, name = ${slug}
              WHERE id = ${organization}
              RETURNING ${organizationFields(psql``)}
            `,
            )
            .then(OrganizationModel.parse),
        };
      });
    },

    async updateOrganizationPlan({ billingPlan, organizationId: organization }) {
      return pool
        .maybeOne(
          psql`/* updateOrganizationPlan */
          UPDATE organizations
          SET plan_name = ${billingPlan}
          WHERE id = ${organization}
          RETURNING ${organizationFields(psql``)}
        `,
        )
        .then(OrganizationModel.parse);
    },
    async updateOrganizationRateLimits(args, action) {
      return await pool.transaction('updateOrganizationRateLimits', async t => {
        const org = await t
          .maybeOne(
            psql`/* updateOrganizationRateLimits */
            UPDATE organizations
            SET limit_operations_monthly = ${args.monthlyRateLimit.operations}, limit_retention_days = ${args.monthlyRateLimit.retentionInDays}
            WHERE id = ${args.organizationId}
            RETURNING ${organizationFields(psql``)}
          `,
          )
          .then(OrganizationModel.parse);
        await action?.();

        return org;
      });
    },
    async createOrganizationInvitation(args) {
      return pool.transaction('createOrganizationInvitation', async trx => {
        const invitation = await trx
          .maybeOne(
            psql`/* createOrganizationInvitation */
            INSERT INTO "organization_invitations" (
              "organization_id"
              , "email"
              , "role_id"
              , "assigned_resources"
            )
            VALUES (
              ${args.organizationId}
              , ${args.email}
              , ${args.roleId}
              , ${args.resourceAssignments === null ? null : psql.jsonb(args.resourceAssignments)}
            )
            RETURNING
              "organization_id" AS "organizationId"
              , "code"
              , "email"
              , to_json("created_at") AS "createdAt"
              , to_json("expires_at") AS "expiresAt"
              , "role_id" AS "roleId"
              , "assigned_resources" AS "assignedResources"
          `,
          )
          .then(OrganizationInvitationModel.parse);

        return invitation;
      });
    },
    async deleteOrganizationInvitationByEmail({ organizationId: organization, email }) {
      return pool.transaction('deleteOrganizationInvitationByEmail', async trx => {
        return trx
          .maybeOne(
            psql`/* deleteOrganizationInvitationByEmail */
                DELETE FROM organization_invitations
                WHERE organization_id = ${organization} AND email = ${email}
                RETURNING
                  "organization_id" AS "organizationId"
                  , "code"
                  , "email"
                  , to_json("created_at") AS "createdAt"
                  , to_json("expires_at") AS "expiresAt"
                  , "role_id" AS "roleId"
                  , "assigned_resources" AS "assignedResources"
              `,
          )
          .then(OrganizationInvitationModel.nullable().parse);
      });
    },
    async addOrganizationMemberViaInvitationCode({
      code,
      userId: user,
      organizationId: organization,
    }) {
      await pool.transaction('addOrganizationMemberViaInvitationCode', async trx => {
        const { roleId, assignedResources } = await trx
          .maybeOne(
            psql`/* deleteInviteAndGetRoleId */
            DELETE
            FROM
              "organization_invitations"
            WHERE
              "organization_id" = ${organization}
              AND "code" = ${code}
            RETURNING
              role_id as "roleId"
              , assigned_resources as "assignedResources"
          `,
          )
          .then(
            z.object({
              roleId: z.string(),
              assignedResources: z.record(z.any()).nullable(),
            }).parse,
          );

        await trx.query(
          psql`/* addOrganizationMemberViaInvitationCode */
            INSERT INTO "organization_member" (
              "organization_id"
              , "user_id"
              , "role_id"
              , "assigned_resources"
              , "created_at"
            )
            VALUES (
              ${organization}
              , ${user}
              , ${roleId}
              , ${assignedResources === null ? null : psql.json(assignedResources)}
              , now()
            )
          `,
        );
      });
    },
    async createOrganizationTransferRequest({ organizationId: organization, userId: user }) {
      const code = Math.random().toString(16).substring(2, 12);

      await pool.any(
        psql`/* createOrganizationTransferRequest */
          UPDATE organizations
          SET
            ownership_transfer_user_id = ${user},
            ownership_transfer_code = ${code},
            ownership_transfer_expires_at = NOW() + INTERVAL '1 day'
          WHERE id = ${organization}
        `,
      );

      return {
        code,
      };
    },
    async getOrganizationTransferRequest({ code, userId: user, organizationId: organization }) {
      return pool
        .maybeOne(
          psql`/* getOrganizationTransferRequest */
          SELECT ownership_transfer_code as code FROM organizations
          WHERE
            ownership_transfer_user_id = ${user}
            AND id = ${organization}
            AND ownership_transfer_code = ${code}
            AND ownership_transfer_expires_at > NOW()
        `,
        )
        .then(z.object({ code: z.string() }).nullable().parse);
    },
    async answerOrganizationTransferRequest({
      organizationId: organization,
      userId: user,
      code,
      accept,
    }) {
      await pool.transaction('answerOrganizationTransferRequest', async tsx => {
        const owner = await tsx.maybeOne(
          psql`/* findOrganizationTransferRequest */
          SELECT user_id
          FROM organizations
          WHERE
            id = ${organization}
            AND ownership_transfer_user_id = ${user}
            AND ownership_transfer_code = ${code}
            AND ownership_transfer_expires_at > NOW()
        `,
        );

        if (!owner) {
          throw new Error('No organization transfer request found');
        }

        if (!accept) {
          // NULL out the transfer request
          await tsx.query(psql`/* rejectOrganizationTransferRequest */
            UPDATE organizations
            SET
              ownership_transfer_user_id = NULL,
              ownership_transfer_code = NULL,
              ownership_transfer_expires_at = NULL
            WHERE id = ${organization}
          `);

          // because it's a rejection, we don't need to do anything else other than null out the transfer request
          return;
        }

        const adminRoleId = await shared.getOrganizationMemberRoleByName(
          {
            organizationId: organization,
            roleName: 'Admin',
          },
          tsx,
        );

        // set admin role
        await tsx.query(psql`/* setAdminRole */
          UPDATE organization_member
          SET role_id = ${adminRoleId}
          WHERE organization_id = ${organization} AND user_id = ${user}
        `);

        // NULL out the transfer request
        // assign the new owner
        await tsx.query(psql`/* acceptOrganizationTransferRequest */
          UPDATE organizations
          SET
            ownership_transfer_user_id = NULL,
            ownership_transfer_code = NULL,
            ownership_transfer_expires_at = NULL,
            user_id = ${user}
          WHERE id = ${organization}
        `);
      });
    },
    async deleteOrganizationMember({ userId: user, organizationId: organization }) {
      await pool.query(
        psql`/* deleteOrganizationMember */
          DELETE FROM organization_member
          WHERE organization_id = ${organization} AND user_id = ${user}
        `,
      );
    },
    async getProjectId({ projectSlug, organizationSlug }) {
      // Based on project's clean_id and organization's clean_id, resolve the actual uuid of the project
      const result = await pool
        .maybeOne(
          psql`/* getProjectId */
          SELECT p.id as id
          FROM projects as p
          LEFT JOIN organizations as org ON (p.org_id = org.id)
          WHERE p.clean_id = ${projectSlug} AND org.clean_id = ${organizationSlug} AND p.type != 'CUSTOM' LIMIT 1`,
        )
        .then(z.object({ id: z.string() }).parse);

      return result.id;
    },
    async getTargetId(selector) {
      const result = await pool
        .maybeOne(
          psql`/* getTargetId (slug) */
            SELECT t.id FROM targets as t
            LEFT JOIN projects AS p ON (p.id = t.project_id)
            LEFT JOIN organizations AS o ON (o.id = p.org_id)
            WHERE
              t.clean_id = ${selector.targetSlug} AND
              p.clean_id = ${selector.projectSlug} AND
              o.clean_id = ${selector.organizationSlug} AND
              p.type != 'CUSTOM'
            LIMIT 1`,
        )
        .then(z.object({ id: z.string() }).parse);

      return result.id;
    },
    async getOrganization({ organizationId }) {
      return pool
        .maybeOne(
          psql`/* getOrganization */ SELECT ${organizationFields(psql``)} FROM organizations WHERE id = ${organizationId} LIMIT 1`,
        )
        .then(OrganizationModel.parse);
    },
    async getOrganizations({ userId: user }) {
      return pool
        .any(
          psql`/* getOrganizations */
          SELECT ${organizationFields(psql`o.`)}
          FROM organizations as o
          LEFT JOIN organization_member as om ON (om.organization_id = o.id)
          WHERE om.user_id = ${user}
          ORDER BY o.created_at DESC
        `,
        )
        .then(z.array(OrganizationModel).parse);
    },
    async getOrganizationByInviteCode({ inviteCode, email }) {
      return pool
        .maybeOne(
          psql`/* getOrganizationByInviteCode */
          SELECT ${organizationFields(psql`o.`)} FROM organizations as o
          LEFT JOIN organization_invitations as i ON (i.organization_id = o.id)
          WHERE
            i.code = ${inviteCode}
            AND i.email = ${email}
            AND i.expires_at > NOW()
          GROUP BY o.id
          LIMIT 1
        `,
        )
        .then(OrganizationModel.nullable().parse);
    },
    async getOrganizationBySlug({ slug }) {
      return pool
        .maybeOne(
          psql`/* getOrganizationBySlug */ SELECT ${organizationFields(psql``)} FROM organizations WHERE clean_id = ${slug} LIMIT 1`,
        )
        .then(OrganizationModel.nullable().parse);
    },
    async getOrganizationByGitHubInstallationId({ installationId }) {
      return pool
        .maybeOne(
          psql`/* getOrganizationByGitHubInstallationId */
          SELECT ${organizationFields(psql``)} FROM organizations
          WHERE github_app_installation_id = ${installationId}
          LIMIT 1
        `,
        )
        .then(OrganizationModel.nullable().parse);
    },
    async getProject({ projectId: project }) {
      return pool
        .maybeOne(
          psql`/* getProject */ SELECT ${projectFields(psql``)} FROM projects WHERE id = ${project} AND type != 'CUSTOM' LIMIT 1`,
        )
        .then(ProjectModel.parse);
    },
    async getProjectBySlug({ slug, organizationId: organization }) {
      return pool
        .maybeOne(
          psql`/* getProjectBySlug */ SELECT ${projectFields(psql``)} FROM projects WHERE clean_id = ${slug} AND org_id = ${organization} AND type != 'CUSTOM' LIMIT 1`,
        )
        .then(ProjectModel.nullable().parse);
    },
    async getProjects({ organizationId: organization }) {
      return pool
        .any(
          psql`/* getProjects */ SELECT ${projectFields(psql``)} FROM projects WHERE org_id = ${organization} AND type != 'CUSTOM' ORDER BY created_at DESC`,
        )
        .then(z.array(ProjectModel).parse);
    },
    findProjectsByIds: batch<{ projectIds: Array<string> }, Map<string, Project>>(
      async function FindProjectByIdsBatchHandler(args) {
        const allProjectIds = args.flatMap(args => args.projectIds);
        const allProjectsLookupMap = new Map<string, Project>();

        if (allProjectIds.length === 0) {
          return args.map(async () => allProjectsLookupMap);
        }

        const result = await pool
          .any(
            psql`/* findProjectsByIds */ SELECT ${projectFields(psql``)} FROM projects WHERE id = ANY(${psql.array(allProjectIds, 'uuid')}) AND type != 'CUSTOM'`,
          )
          .then(z.array(ProjectModel).parse);

        result.forEach(project => {
          allProjectsLookupMap.set(project.id, project);
        });

        return args.map(async arg => {
          const map = new Map<string, Project>();
          for (const projectId of arg.projectIds) {
            const project = allProjectsLookupMap.get(projectId);
            if (!project) continue;
            map.set(projectId, project);
          }

          return map;
        });
      },
    ),
    getProjectById(projectId) {
      return this.findProjectsByIds({ projectIds: [projectId] }).then(
        map => map.get(projectId) ?? null,
      );
    },
    async updateProjectSlug({ slug, organizationId: organization, projectId: project }) {
      return pool.transaction('updateProjectSlug', async t => {
        const projectSlugExists = await t.exists(
          psql`/* projectSlugExists */ SELECT 1 FROM projects WHERE clean_id = ${slug} AND id != ${project} AND org_id = ${organization} LIMIT 1`,
        );

        if (projectSlugExists) {
          return {
            ok: false,
            message: 'Project slug is already taken',
          };
        }

        return {
          ok: true,
          project: await t
            .maybeOne(
              psql`/* updateProjectSlug */
              UPDATE projects
              SET clean_id = ${slug}, name = ${slug}
              WHERE id = ${project} AND org_id = ${organization}
              RETURNING ${projectFields(psql``)}
            `,
            )
            .then(ProjectModel.parse),
        };
      });
    },
    async updateNativeSchemaComposition({ projectId: project, enabled }) {
      return pool
        .maybeOne(
          psql`/* updateNativeSchemaComposition */
          UPDATE projects
          SET
            native_federation = ${enabled},
            external_composition_enabled = FALSE
          WHERE id = ${project}
          RETURNING ${projectFields(psql``)}
        `,
        )
        .then(ProjectModel.parse);
    },
    async enableExternalSchemaComposition({ projectId: project, endpoint, encryptedSecret }) {
      return pool
        .maybeOne(
          psql`/* enableExternalSchemaComposition */
          UPDATE projects
          SET
            native_federation = FALSE,
            external_composition_enabled = TRUE,
            external_composition_endpoint = ${endpoint},
            external_composition_secret = ${encryptedSecret}
          WHERE id = ${project}
          RETURNING ${projectFields(psql``)}
        `,
        )
        .then(ProjectModel.parse);
    },
    async enableProjectNameInGithubCheck({ projectId: project }) {
      return pool
        .maybeOne(
          psql`/* enableProjectNameInGithubCheck */
          UPDATE projects
          SET github_check_with_project_name = true
          WHERE id = ${project}
          RETURNING ${projectFields(psql``)}
        `,
        )
        .then(ProjectModel.parse);
    },

    async deleteProject({ organizationId: organization, projectId: project }) {
      const result = await pool.transaction('deleteProject', async t => {
        const tokens = await t
          .any(
            psql`/* deleteProject */
            SELECT token FROM tokens WHERE project_id = ${project} AND deleted_at IS NULL
          `,
          )
          .then(z.array(z.object({ token: z.string() })).parse);

        return {
          project: await t
            .maybeOne(
              psql`/* deleteProject */
                DELETE FROM projects
                WHERE id = ${project} AND org_id = ${organization}
                RETURNING ${projectFields(psql``)}
              `,
            )
            .then(ProjectModel.parse),
          tokens: tokens.map(row => row.token),
        };
      });

      return {
        ...result.project,
        tokens: result.tokens,
      };
    },
    async createTarget({ organizationId: organization, projectId: project, slug }) {
      return pool.transaction('createTarget', async t => {
        const targetSlugExists = await t.exists(
          psql`/* targetSlugExists */ SELECT 1 FROM targets WHERE clean_id = ${slug} AND project_id = ${project} LIMIT 1`,
        );

        if (targetSlugExists) {
          return {
            ok: false,
            message: 'Target slug is already taken',
          };
        }

        const result = await t.maybeOne(psql`/* createTarget */
          INSERT INTO targets
            (name, clean_id, project_id)
          VALUES
            (${slug}, ${slug}, ${project})
          RETURNING
            ${targetSQLFields}
        `);

        return {
          ok: true,
          target: {
            ...TargetModel.parse(result),
            orgId: organization,
          },
        };
      });
    },
    async updateTargetSlug({
      slug,
      organizationId: organization,
      projectId: project,
      targetId: target,
    }) {
      return pool.transaction('updateTargetSlug', async t => {
        const targetSlugExists = await t.exists(
          psql`/* targetSlugExists */ SELECT 1 FROM targets WHERE clean_id = ${slug} AND id != ${target} AND project_id = ${project} LIMIT 1`,
        );

        if (targetSlugExists) {
          return {
            ok: false,
            message: 'Target slug is already taken',
          };
        }

        const result = await t
          .maybeOne(
            psql`/* updateTargetSlug */
            UPDATE targets
            SET clean_id = ${slug}, name = ${slug}
            WHERE id = ${target} AND project_id = ${project}
            RETURNING ${targetSQLFields}
          `,
          )
          .then(TargetModel.parse);

        return {
          ok: true,
          target: {
            ...result,
            orgId: organization,
          },
        };
      });
    },
    async deleteTarget({ organizationId: organization, targetId: target }) {
      const result = await pool.transaction('deleteTarget', async t => {
        const tokens = await t
          .any(
            psql`/* findTokensForDeletion */
            SELECT token FROM tokens WHERE target_id = ${target} AND deleted_at IS NULL
          `,
          )
          .then(z.array(z.object({ token: z.string() })).parse);

        const targetResult = await t
          .maybeOne(
            psql`/* deleteTarget */
              DELETE FROM targets
              WHERE id = ${target}
              RETURNING
                ${targetSQLFields}
            `,
          )
          .then(TargetModel.parse);

        await t.query(
          psql`/* deleteTargetSchemaVersions */ DELETE FROM schema_versions WHERE target_id = ${target}`,
        );

        return {
          target: targetResult,
          tokens: tokens.map(row => row.token),
        };
      });

      return {
        ...result.target,
        orgId: organization,
        tokens: result.tokens,
      };
    },
    getTarget: batch(
      async (
        selectors: Array<{
          organizationId: string;
          projectId: string;
          targetId: string;
        }>,
      ) => {
        const uniqueSelectorsMap = new Map<string, (typeof selectors)[0]>();

        for (const selector of selectors) {
          const key = JSON.stringify({
            organization: selector.organizationId,
            project: selector.projectId,
            target: selector.targetId,
          });

          uniqueSelectorsMap.set(key, selector);
        }

        const uniqueSelectors = Array.from(uniqueSelectorsMap.values());

        const rows = await pool
          .any(
            psql`/* getTarget */
              SELECT
                ${targetSQLFields}
              FROM
                targets
              WHERE
                (id, project_id) IN (
                  (${psql.join(
                    uniqueSelectors.map(s => psql`${s.targetId}, ${s.projectId}`),
                    psql`), (`,
                  )})
                )
            `,
          )
          .then(z.array(TargetModel).parse);

        return selectors.map(selector => {
          const row = rows.find(
            row => row.id === selector.targetId && row.projectId === selector.projectId,
          );

          if (!row) {
            return Promise.reject(
              new Error(
                `Target not found (target=${selector.targetId}, project=${selector.projectId})`,
              ),
            );
          }

          return Promise.resolve({
            ...row,
            orgId: selector.organizationId,
          });
        });
      },
    ),
    async getTargetBySlug({ organizationId: organization, projectId: project, slug }) {
      const result = await pool.maybeOne(psql`/* getTargetBySlug */
        SELECT
          ${targetSQLFields}
        FROM
          targets
        WHERE
          clean_id = ${slug}
          AND project_id = ${project}
        LIMIT 1
      `);

      if (!result) {
        return null;
      }

      return {
        ...TargetModel.parse(result),
        orgId: organization,
      };
    },
    async getTargets({ organizationId, projectId }) {
      const results = await pool
        .any(
          psql`/* getTargets */
        SELECT
          ${targetSQLFields}
        FROM
          targets
        WHERE
          project_id = ${projectId}
        ORDER BY
          created_at DESC
      `,
        )
        .then(z.array(TargetModel).parse);

      return results.map(r => ({
        ...r,
        orgId: organizationId,
      }));
    },
    findTargetsByIds: batchBy<
      {
        organizationId: string;
        targetIds: Array<string>;
      },
      Map<string, Target>
    >(
      org => org.organizationId,
      async function FindTargetsByIdsBatchHandler(args) {
        const resultLookupMap = new Map<string, Target>();

        const allTargetIds = args.flatMap(arg => arg.targetIds);

        if (allTargetIds.length === 0) {
          return args.map(async () => resultLookupMap);
        }

        const orgId = args[0].organizationId;

        const results = await pool
          .any(
            psql`/* getTargets */
          SELECT
          ${targetSQLFields}
          FROM
          "targets"
          WHERE
          "id" = ANY(${psql.array(allTargetIds, 'uuid')})
        `,
          )
          .then(z.array(TargetModel).parse);

        for (const row of results) {
          const target: Target = { ...row, orgId };
          resultLookupMap.set(target.id, target);
        }

        return args.map(async arg => {
          const map = new Map<string, Target>();
          for (const targetId of arg.targetIds) {
            const target = resultLookupMap.get(targetId);
            if (!target) continue;
            map.set(targetId, target);
          }
          return map;
        });
      },
    ),
    async getTargetIdsOfOrganization({ organizationId: organization }) {
      const results = await pool
        .any(
          psql`/* getTargetIdsOfOrganization */
          SELECT t.id as id FROM targets as t
          LEFT JOIN projects as p ON (p.id = t.project_id)
          WHERE p.org_id = ${organization}
          GROUP BY t.id
        `,
        )
        .then(z.array(TargetIdModel).parse);

      return results.map(r => r.id);
    },
    async getTargetIdsOfProject({ projectId: project }) {
      const results = await pool
        .any(
          psql`/* getTargetIdsOfProject */
          SELECT id FROM targets WHERE project_id = ${project}
        `,
        )
        .then(z.array(TargetIdModel).parse);

      return results.map(r => r.id);
    },
    async getTargetSettings({ targetId: target, projectId: project }) {
      return pool
        .maybeOne(
          psql`/* getTargetSettings */
          SELECT
            ${targetSettingsFields(psql`t.`)}
            , array_agg(DISTINCT tv.destination_target_id)
              FILTER (WHERE tv.destination_target_id IS NOT NULL)
                AS "targets"
          FROM targets AS t
          LEFT JOIN target_validation AS tv ON (tv.target_id = t.id)
          WHERE t.id = ${target} AND t.project_id = ${project}
          GROUP BY t.id
          LIMIT 1
        `,
        )
        .then(TargetSettingsModel.parse);
    },
    async updateTargetDangerousChangeClassification({
      targetId: target,
      projectId: project,
      failDiffOnDangerousChange,
    }) {
      return pool
        .transaction('updateTargetDangerousChangeClassification', async trx => {
          return trx.maybeOne(psql`/* updateTargetValidationSettings */
            UPDATE targets as t
            SET fail_diff_on_dangerous_change = ${failDiffOnDangerousChange}
            FROM (
              SELECT
                it.id,
                array_agg(tv.destination_target_id) as targets
              FROM targets AS it
              LEFT JOIN target_validation AS tv ON (tv.target_id = it.id)
              WHERE it.id = ${target} AND it.project_id = ${project}
              GROUP BY it.id
              LIMIT 1
            ) ret
            WHERE t.id = ret.id
            RETURNING
              ${targetSettingsFields(psql`t.`)}
              , ret.targets
          `);
        })
        .then(TargetSettingsModel.parse);
    },
    async updateTargetValidationSettings({
      targetId: target,
      projectId: project,
      percentage,
      period,
      targets,
      excludedClients,
      excludedAppDeployments,
      breakingChangeFormula,
      requestCount,
      isEnabled,
    }) {
      return (
        await pool
          .transaction('updateTargetValidationSettings', async trx => {
            if (targets) {
              await trx.query(psql`/* deleteTargetValidation */
              DELETE
              FROM target_validation
              WHERE destination_target_id NOT IN (${psql.join(targets, psql`, `)})
                AND target_id = ${target}
            `);

              await trx.query(psql`/* insertTargetValidation */
              INSERT INTO target_validation
              (target_id, destination_target_id)
              VALUES
              (
              ${psql.join(
                targets.map(dest => psql.join([target, dest], psql`, `)),
                psql`), (`,
              )}
              )
              ON CONFLICT (target_id, destination_target_id) DO NOTHING
            `);
            } else {
              const targetValidationRowExists = await trx.exists(psql`/* findTargetValidation */
              SELECT 1 FROM target_validation WHERE target_id = ${target}
            `);

              if (!targetValidationRowExists) {
                await trx.query(psql`/* insertTargetValidation */
                INSERT INTO target_validation (target_id, destination_target_id) VALUES (${target}, ${target})
              `);
              }
            }

            return trx.maybeOne(psql`/* updateTargetValidationSettings */
            UPDATE
              targets as t
            SET
              validation_percentage = COALESCE(${percentage ?? null}, validation_percentage)
              , validation_period = COALESCE(${period ?? null}, validation_period)
              , validation_excluded_clients = COALESCE(${excludedClients?.length ? psql.array(excludedClients, 'text') : null}, validation_excluded_clients)
              , validation_excluded_app_deployments = COALESCE(${excludedAppDeployments?.length ? psql.array(excludedAppDeployments, 'text') : null}, validation_excluded_app_deployments)
              , validation_request_count = COALESCE(${requestCount ?? null}, validation_request_count)
              , validation_breaking_change_formula = COALESCE(${breakingChangeFormula ?? null}, validation_breaking_change_formula)
              , validation_enabled = COALESCE(${isEnabled ?? null}, validation_enabled)
            FROM (
              SELECT
                it.id
                , array_agg(tv.destination_target_id) as targets
              FROM targets AS it
                LEFT JOIN target_validation AS tv ON (tv.target_id = it.id)
              WHERE
                it.id = ${target}
                AND it.project_id = ${project}
              GROUP BY
                it.id
              LIMIT 1
            ) ret
            WHERE
              t.id = ret.id
            RETURNING
              ${targetSettingsFields(psql`t.`)}
              , ret.targets
          `);
          })
          .then(TargetSettingsModel.parse)
      ).validation;
    },

    async updateTargetAppDeploymentProtectionSettings({
      targetId: target,
      projectId: project,
      isEnabled,
      minDaysInactive,
      minDaysSinceCreation,
      maxTrafficPercentage,
      trafficPeriodDays,
      ruleLogic,
    }: {
      targetId: string;
      projectId: string;
      isEnabled?: boolean | null;
      minDaysInactive?: number | null;
      minDaysSinceCreation?: number | null;
      maxTrafficPercentage?: number | null;
      trafficPeriodDays?: number | null;
      ruleLogic?: 'AND' | 'OR' | null;
    }) {
      return pool
        .maybeOne(
          psql`/* updateTargetAppDeploymentProtectionSettings */
            UPDATE
              targets
            SET
              app_deployment_protection_enabled = COALESCE(${isEnabled ?? null}, app_deployment_protection_enabled)
              , app_deployment_protection_min_days_inactive = COALESCE(${minDaysInactive ?? null}, app_deployment_protection_min_days_inactive)
              , app_deployment_protection_max_traffic_percentage = COALESCE(${maxTrafficPercentage ?? null}, app_deployment_protection_max_traffic_percentage)
              , app_deployment_protection_traffic_period_days = COALESCE(${trafficPeriodDays ?? null}, app_deployment_protection_traffic_period_days)
              , app_deployment_protection_min_days_since_creation = COALESCE(${minDaysSinceCreation ?? null}, app_deployment_protection_min_days_since_creation)
              , app_deployment_protection_rule_logic = COALESCE(${ruleLogic ?? null}, app_deployment_protection_rule_logic)
            WHERE
              id = ${target}
              AND project_id = ${project}
            RETURNING
              ${targetSettingsFields(psql``)}
              , null as targets
          `,
        )
        .then(TargetSettingsModel.parse)
        .then(r => r.appDeploymentProtection);
    },

    async countSchemaVersionsOfProject({ projectId: project, period }) {
      if (period) {
        const result = await pool
          .maybeOne(
            psql`/* countPeriodSchemaVersionsOfProject */
            SELECT COUNT(*) as total FROM schema_versions as sv
            LEFT JOIN targets as t ON (t.id = sv.target_id)
            WHERE
              t.project_id = ${project}
              AND sv.created_at >= ${period.from.toISOString()}
              AND sv.created_at < ${period.to.toISOString()}
          `,
          )
          .then(z.object({ total: z.number() }).nullable().parse);
        return result?.total ?? 0;
      }

      const result = await pool
        .maybeOne(
          psql`/* countSchemaVersionsOfProject */
          SELECT COUNT(*) as total FROM schema_versions as sv
          LEFT JOIN targets as t ON (t.id = sv.target_id)
          WHERE t.project_id = ${project}
        `,
        )
        .then(z.object({ total: z.number() }).nullable().parse);

      return result?.total ?? 0;
    },
    async countSchemaVersionsOfTarget({ targetId: target, period }) {
      if (period) {
        const result = await pool
          .maybeOne(
            psql`/* countPeriodSchemaVersionsOfTarget */
            SELECT COUNT(*) as total FROM schema_versions
            WHERE
              target_id = ${target}
              AND created_at >= ${period.from.toISOString()}
              AND created_at < ${period.to.toISOString()}
          `,
          )
          .then(z.object({ total: z.number() }).nullable().parse);
        return result?.total ?? 0;
      }

      const result = await pool
        .maybeOne(
          psql`/* countSchemaVersionsOfTarget */
          SELECT COUNT(*) as total FROM schema_versions WHERE target_id = ${target}
        `,
        )
        .then(z.object({ total: z.number() }).nullable().parse);

      return result?.total ?? 0;
    },

    async hasSchema({ targetId: target }) {
      return pool.exists(
        psql`/* hasSchema */
          SELECT 1 FROM schema_versions as v WHERE v.target_id = ${target} LIMIT 1
        `,
      );
    },
    async getMaybeLatestValidVersion(args) {
      const version = await pool.maybeOne(
        psql`/* getMaybeLatestValidVersion */
          SELECT
            ${schemaVersionSQLFields(psql`sv.`)}
          FROM schema_versions as sv
          WHERE sv.target_id = ${args.targetId} AND sv.is_composable IS TRUE
          ORDER BY sv.created_at DESC
          LIMIT 1
        `,
      );

      if (!version) {
        return null;
      }

      return SchemaVersionModel.parse(version);
    },
    async getLatestValidVersion({ targetId: target }) {
      const version = await pool.maybeOne(
        psql`/* getLatestValidVersion */
          SELECT
            ${schemaVersionSQLFields(psql`sv.`)}
          FROM schema_versions as sv
          WHERE sv.target_id = ${target} AND sv.is_composable IS TRUE
          ORDER BY sv.created_at DESC
          LIMIT 1
        `,
      );

      return SchemaVersionModel.parse(version);
    },
    async getMaybeLatestVersion(args) {
      const version = await pool.maybeOne(
        psql`/* getMaybeLatestVersion */
          SELECT
            ${schemaVersionSQLFields(psql`sv.`)}
          FROM
            "schema_versions" AS "sv"
          WHERE
            "sv"."target_id" = ${args.targetId}
          ORDER BY
            "sv"."created_at" DESC
          LIMIT 1
        `,
      );

      if (!version) {
        return null;
      }

      return SchemaVersionModel.parse(version);
    },
    async getVersionBeforeVersionId(args) {
      const version = await pool.maybeOne(
        psql`/* getVersionBeforeVersionId */
          SELECT
            ${schemaVersionSQLFields()}
          FROM "schema_versions"
          WHERE
            "target_id" = ${args.targetId}
            AND (
              (
                "created_at" = ${args.beforeVersionCreatedAt}
                AND "id" < ${args.beforeVersionId}
              )
              OR "created_at" < ${args.beforeVersionCreatedAt}
            )
            ${args.onlyComposable ? psql`AND "is_composable" = TRUE` : psql``}
          ORDER BY
            "created_at" DESC
          LIMIT 1
        `,
      );

      if (!version) {
        return null;
      }

      return SchemaVersionModel.parse(version);
    },
    async getSchemaByNameOfVersion(args) {
      return pool
        .maybeOne(
          psql`/* getSchemaByNameOfVersion */
            SELECT
              ${schemaLogFields(psql`sl.`)}
              , p.type
            FROM schema_version_to_log AS svl
            LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
            LEFT JOIN projects as p ON (p.id = sl.project_id)
            WHERE
              svl.version_id = ${args.versionId}
              AND sl.action = 'PUSH'
              AND p.type != 'CUSTOM'
              AND lower(sl.service_name) = lower(${args.serviceName})
            ORDER BY
              sl.created_at DESC
          `,
        )
        .then(SchemaPushLogModel.nullable().parse);
    },
    async getSchemasOfVersion({ versionId: version, includeMetadata: _includeMetadata = false }) {
      return pool
        .any(
          psql`/* getSchemasOfVersion */
            SELECT
              ${schemaLogFields(psql`sl.`)}
              , p.type
            FROM schema_version_to_log AS svl
            LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
            LEFT JOIN projects as p ON (p.id = sl.project_id)
            WHERE
              svl.version_id = ${version}
              AND sl.action = 'PUSH'
              AND p.type != 'CUSTOM'
            ORDER BY
              sl.created_at DESC
          `,
        )
        .then(z.array(SchemaPushLogModel).parse);
    },
    async getServiceSchemaOfVersion(args) {
      return pool
        .maybeOne(
          psql`/* getServiceSchemaOfVersion */
          SELECT
              ${schemaLogFields(psql`sl.`)}
              , p.type
            FROM schema_version_to_log AS svl
            LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
            LEFT JOIN projects as p ON (p.id = sl.project_id)
            WHERE
              svl.version_id = ${args.schemaVersionId}
              AND sl.action = 'PUSH'
              AND p.type != 'CUSTOM'
              AND lower(sl.service_name) = lower(${args.serviceName})
        `,
        )
        .then(SchemaPushLogModel.nullable().parse);
    },

    async getMatchingServiceSchemaOfVersions(versions) {
      const after = await pool
        .maybeOne(
          psql`/* getMatchingServiceSchemaOfVersions */
          SELECT sl.service_name, sl.sdl
          FROM schema_versions as sv
          LEFT JOIN schema_log as sl ON sv.action_id = sl.id
          WHERE sv.id = ${versions.after} AND service_name IS NOT NULL
        `,
        )
        .then(z.object({ service_name: z.string(), sdl: z.string() }).parse);

      // It's an initial version, so we just need to fetch a single version
      if (!versions.before) {
        return { serviceName: after.service_name, after: after.sdl, before: null };
      }

      const before = await pool
        .maybeOne(
          psql`/* getMatchingServiceSchemaOfVersions */
          SELECT sl.sdl
          FROM schema_version_to_log as svtl
          LEFT JOIN schema_log as sl ON svtl.action_id = sl.id
          WHERE svtl.version_id = ${versions.before} AND sl.service_name = ${after.service_name}
        `,
        )
        .then(z.object({ sdl: z.string().nullable() }).nullable().parse);

      return { serviceName: after.service_name, after: after.sdl, before: before?.sdl ?? null };
    },

    async getMaybeVersion({ projectId: project, targetId: target, versionId: version }) {
      const result = await pool.maybeOne(psql`/* getMaybeVersion */
        SELECT
          ${schemaVersionSQLFields(psql`sv.`)}
        FROM schema_versions as sv
        LEFT JOIN schema_log as sl ON (sl.id = sv.action_id)
        LEFT JOIN targets as t ON (t.id = sv.target_id)
        WHERE
          sv.target_id = ${target}
          AND t.project_id = ${project}
          AND sv.id = ${version}
        LIMIT 1
      `);

      if (!result) {
        return null;
      }

      return SchemaVersionModel.parse(result);
    },
    async getPaginatedSchemaVersionsForTargetId(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      const query = psql`/* getPaginatedSchemaVersionsForTargetId */
        SELECT
          ${schemaVersionSQLFields()}
        FROM
          "schema_versions"
        WHERE
          "target_id" = ${args.targetId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
        ORDER BY
          "created_at" DESC
          , "id" DESC
        LIMIT ${limit + 1}
      `;

      const result = await pool.any(query);

      let edges = result.map(row => {
        const node = SchemaVersionModel.parse(row);

        return {
          node,
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = edges.length > limit;
      edges = edges.slice(0, limit);

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return edges[edges.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return edges[0]?.cursor ?? '';
          },
        },
      };
    },
    async deleteSchema(args) {
      return pool.transaction('deleteSchema', async trx => {
        // fetch the latest version
        const latestVersion = await trx
          .maybeOne(
            psql`/* findLatestSchemaVersion */
            SELECT sv.id, sv.base_schema
            FROM schema_versions as sv
            WHERE sv.target_id = ${args.targetId}
            ORDER BY sv.created_at DESC
            LIMIT 1
          `,
          )
          .then(z.object({ id: z.string(), base_schema: z.string().nullable() }).parse);

        // create a new action
        const deleteActionResult = await trx
          .maybeOne(
            psql`/* createDeleteActionSchemaLog */
            INSERT INTO schema_log
              (
                author,
                commit,
                service_name,
                project_id,
                target_id,
                action
              )
            VALUES
              (
                ${'system'}::text,
                ${'system'}::text,
                lower(${args.serviceName}::text),
                ${args.projectId},
                ${args.targetId},
                'DELETE'
              )
            RETURNING
              id
              , to_json("created_at") AS "createdAt"
              , "service_name" AS "serviceName"
              , "target_id" AS "targetId"
          `,
          )
          .then(
            z.object({
              id: z.string(),
              createdAt: z.string(),
              serviceName: z.string(),
              targetId: z.string(),
            }).parse,
          );

        // creates a new version
        const newVersion = await insertSchemaVersion(trx, {
          isComposable: args.composable,
          targetId: args.targetId,
          actionId: deleteActionResult.id,
          baseSchema: latestVersion.base_schema,
          previousSchemaVersion: latestVersion.id,
          diffSchemaVersionId: args.diffSchemaVersionId,
          compositeSchemaSDL: args.compositeSchemaSDL,
          supergraphSDL: args.supergraphSDL,
          schemaCompositionErrors: args.schemaCompositionErrors,
          // Deleting a schema is done via CLI and not associated to a commit or a pull request.
          github: null,
          tags: args.tags,
          schemaMetadata: args.schemaMetadata,
          metadataAttributes: args.metadataAttributes,
          hasContractCompositionErrors:
            args.contracts?.some(c => c.schemaCompositionErrors != null) ?? false,
          conditionalBreakingChangeMetadata: args.conditionalBreakingChangeMetadata,
        });

        // Move all the schema_version_to_log entries of the previous version to the new version
        await trx.query(psql`/* moveSchemaVersionToLog */
          INSERT INTO schema_version_to_log
            (version_id, action_id)
          SELECT ${newVersion.id}::uuid as version_id, svl.action_id
          FROM schema_version_to_log svl
          LEFT JOIN schema_log sl ON (sl.id = svl.action_id)
          WHERE svl.version_id = ${latestVersion.id} AND sl.action = 'PUSH' AND lower(sl.service_name) != lower(${args.serviceName})
        `);

        await trx.query(psql`/* insertSchemaVersionToLog */
          INSERT INTO schema_version_to_log
            (version_id, action_id)
          VALUES
            (${newVersion.id}, ${deleteActionResult.id})
        `);

        if (args.changes != null) {
          await insertSchemaVersionChanges(trx, {
            versionId: newVersion.id,
            changes: args.changes,
          });
        }

        if (args.coordinatesDiff) {
          await updateSchemaCoordinateStatus(trx, {
            targetId: args.targetId,
            versionId: newVersion.id,
            coordinatesDiff: args.coordinatesDiff,
          });
        }

        for (const contract of args.contracts ?? []) {
          const schemaVersionContractId = await insertSchemaVersionContract(trx, {
            schemaVersionId: newVersion.id,
            contractId: contract.contractId,
            contractName: contract.contractName,
            schemaCompositionErrors: contract.schemaCompositionErrors,
            compositeSchemaSDL: contract.compositeSchemaSDL,
            supergraphSDL: contract.supergraphSDL,
          });
          await insertSchemaVersionContractChanges(trx, {
            schemaVersionContractId,
            changes: contract.changes,
          });
        }

        await args.actionFn(newVersion.id);

        return {
          kind: 'composite',
          id: deleteActionResult.id,
          date: deleteActionResult.createdAt as any,
          service_name: deleteActionResult.serviceName,
          target: deleteActionResult.targetId,
          action: 'DELETE',
          versionId: newVersion.id,
        } satisfies CompositeDeletedSchemaLog & {
          versionId: string;
        };
      });
    },
    async createVersion(input) {
      const url = input.url ?? null;
      const service = input.service ?? null;

      const output = await pool.transaction('createVersion', async trx => {
        const log = await pool
          .maybeOne(
            psql`/* createVersion */
            INSERT INTO schema_log
              (
                author,
                service_name,
                service_url,
                commit,
                sdl,
                project_id,
                target_id,
                metadata,
                action
              )
            VALUES
              (
                ${input.author},
                lower(${service}::text),
                ${url}::text,
                ${input.commit}::text,
                ${input.schema}::text,
                ${input.projectId},
                ${input.targetId},
                ${input.metadata},
                'PUSH'
              )
            RETURNING id
          `,
          )
          .then(z.object({ id: z.string() }).parse);

        // creates a new version
        const version = await insertSchemaVersion(trx, {
          isComposable: input.valid,
          targetId: input.targetId,
          actionId: log.id,
          baseSchema: input.base_schema,
          previousSchemaVersion: input.previousSchemaVersion,
          diffSchemaVersionId: input.diffSchemaVersionId,
          compositeSchemaSDL: input.compositeSchemaSDL,
          supergraphSDL: input.supergraphSDL,
          schemaCompositionErrors: input.schemaCompositionErrors,
          github: input.github,
          tags: input.tags,
          schemaMetadata: input.schemaMetadata,
          metadataAttributes: input.metadataAttributes,
          hasContractCompositionErrors:
            input.contracts?.some(c => c.schemaCompositionErrors != null) ?? false,
          conditionalBreakingChangeMetadata: input.conditionalBreakingChangeMetadata,
        });

        await trx.query(psql`/* insertSchemaVersionToLog */
          INSERT INTO schema_version_to_log
            (version_id, action_id)
          SELECT * FROM
            ${psql.unnest(
              input.logIds.concat(log.id).map(actionId =>
                // Note: change.criticality.level is actually a computed value from meta
                [version.id, actionId],
              ),
              ['uuid', 'uuid'],
            )}
        `);

        await insertSchemaVersionChanges(trx, {
          versionId: version.id,
          changes: input.changes,
        });

        for (const contract of input.contracts ?? []) {
          const schemaVersionContractId = await insertSchemaVersionContract(trx, {
            schemaVersionId: version.id,
            contractId: contract.contractId,
            contractName: contract.contractName,
            schemaCompositionErrors: contract.schemaCompositionErrors,
            compositeSchemaSDL: contract.compositeSchemaSDL,
            supergraphSDL: contract.supergraphSDL,
          });
          await insertSchemaVersionContractChanges(trx, {
            schemaVersionContractId,
            changes: contract.changes,
          });
        }

        if (input.coordinatesDiff) {
          await updateSchemaCoordinateStatus(trx, {
            targetId: input.targetId,
            versionId: version.id,
            coordinatesDiff: input.coordinatesDiff,
          });
        }

        await input.actionFn(version.id);

        return {
          version,
          log,
        };
      });

      return output.version;
    },

    async getSchemaChangesForVersion(args) {
      // TODO: should this be paginated?
      const changes = await pool
        .any(
          psql`/* getSchemaChangesForVersion */
        SELECT
          "change_type" as "type",
          "meta",
          "severity_level" as "severityLevel",
          "is_safe_based_on_usage" as "isSafeBasedOnUsage"
        FROM
          "schema_version_changes"
        WHERE
          "schema_version_id" = ${args.versionId}
      `,
        )
        .then(z.array(HiveSchemaChangeModel).parse);

      if (changes.length === 0) {
        return null;
      }

      return changes;
    },

    getSchemaLog: batch(async selectors => {
      const rows = await pool.any(
        psql`/* getSchemaLog */
            SELECT
              ${schemaLogFields(psql`sl.`)}
              , p.type
            FROM schema_log as sl
            LEFT JOIN projects as p ON (p.id = sl.project_id)
            WHERE (sl.id, sl.target_id) IN ((${psql.join(
              selectors.map(s => psql`${s.commit}, ${s.targetId}`),
              psql`), (`,
            )}))
        `,
      );
      const schemas = z.array(SchemaLogModel).parse(rows);

      return selectors.map(selector => {
        const schema = schemas.find(
          row => row.id === selector.commit && row.target === selector.targetId,
        );

        if (schema) {
          return Promise.resolve(schema);
        }

        return Promise.reject(
          new Error(
            `Schema log not found (commit=${selector.commit}, target=${selector.targetId})`,
          ),
        );
      });
    }),
    async addSlackIntegration({ organizationId: organization, token }) {
      await pool.any(
        psql`/* addSlackIntegration */
          UPDATE organizations
          SET slack_token = ${token}
          WHERE id = ${organization}
        `,
      );
    },
    async deleteSlackIntegration({ organizationId: organization }) {
      await pool.any(
        psql`/* deleteSlackIntegration */
          UPDATE organizations
          SET slack_token = NULL
          WHERE id = ${organization}
        `,
      );
    },
    async getSlackIntegrationToken({ organizationId: organization }) {
      const result = await pool
        .maybeOne(
          psql`/* getSlackIntegrationToken */
            SELECT slack_token
            FROM organizations
            WHERE id = ${organization}
          `,
        )
        .then(z.object({ slack_token: z.string().nullable() }).nullable().parse);

      return result?.slack_token;
    },
    async addGitHubIntegration({ organizationId: organization, installationId }) {
      await pool.any(
        psql`/* addGitHubIntegration */
          UPDATE organizations
          SET github_app_installation_id = ${installationId}
          WHERE id = ${organization}
        `,
      );
    },
    async deleteGitHubIntegration({ organizationId: organization }) {
      await pool.any(
        psql`/* deleteGitHubIntegration */
          UPDATE organizations
          SET github_app_installation_id = NULL
          WHERE id = ${organization}
        `,
      );
      await pool.any(
        psql`/* resetProjectsGitHubRepository */
          UPDATE projects
          SET git_repository = NULL
          WHERE org_id = ${organization}
        `,
      );
    },
    async getGitHubIntegrationInstallationId({ organizationId: organization }) {
      return await pool
        .maybeOneFirst(
          psql`/* getGitHubIntegrationInstallationId */
            SELECT github_app_installation_id
            FROM organizations
            WHERE id = ${organization}
          `,
        )
        .then(z.string().nullable().parse);
    },
    async addAlertChannel({ projectId, name, type, slackChannel, webhookEndpoint }) {
      return AlertChannelModel.parse(
        await pool.maybeOne(
          psql`/* addAlertChannel */
            INSERT INTO alert_channels
              ("name", "type", "project_id", "slack_channel", "webhook_endpoint")
            VALUES
              (${name}, ${type}, ${projectId}, ${slackChannel ?? null}, ${webhookEndpoint ?? null})
            RETURNING
              ${alertChannelFields()}
          `,
        ),
      );
    },
    async deleteAlertChannels({ projectId, channelIds }) {
      return pool
        .any(
          psql`/* deleteAlertChannels */
          DELETE FROM alert_channels
          WHERE
            project_id = ${projectId} AND
            id IN (${psql.join(channelIds, psql`, `)})
          RETURNING
            ${alertChannelFields()}
        `,
        )
        .then(z.array(AlertChannelModel).parse);
    },
    async getAlertChannels({ projectId: project }) {
      return pool
        .any(
          psql`/* getAlertChannels */
          SELECT
            ${alertChannelFields()}
          FROM alert_channels
          WHERE project_id = ${project}
          ORDER BY created_at DESC`,
        )
        .then(z.array(AlertChannelModel).parse);
    },

    async addAlert({ organizationId, projectId, targetId, channelId, type }) {
      return {
        ...(await pool
          .maybeOne(
            psql`/* addAlert */
            INSERT INTO alerts
              ("type", "alert_channel_id", "target_id", "project_id")
            VALUES
              (${type}, ${channelId}, ${targetId}, ${projectId})
            RETURNING
              ${alertFields()}
          `,
          )
          .then(AlertModel.parse)),
        organizationId,
      };
    },
    async deleteAlerts({ organizationId: organization, projectId: project, alertIds: alerts }) {
      const result = await pool
        .any(
          psql`/* deleteAlerts */
          DELETE FROM alerts
          WHERE
            project_id = ${project} AND
            id IN (${psql.join(alerts, psql`, `)})
          RETURNING
            ${alertFields()}
        `,
        )
        .then(z.array(AlertModel).parse);

      return result.map(row => ({ ...row, organizationId: organization }));
    },
    async getAlerts({ organizationId: organization, projectId: project }) {
      const result = await pool
        .any(
          psql`/* getAlerts */
          SELECT
            ${alertFields()}
          FROM alerts
          WHERE project_id = ${project}
          ORDER BY created_at DESC`,
        )
        .then(z.array(AlertModel).parse);

      return result.map(row => ({ ...row, organizationId: organization }));
    },
    async adminGetOrganizationsTargetPairs() {
      const results = await pool
        .any(
          psql`/* adminGetOrganizationsTargetPairs */
          SELECT
            o.id as organization,
            t.id as target
          FROM targets AS t
          LEFT JOIN projects AS p ON (p.id = t.project_id)
          LEFT JOIN organizations AS o ON (o.id = p.org_id)
        `,
        )
        .then(z.array(OrganizationTargetPairModel).parse);
      return results;
    },
    async getGetOrganizationsAndTargetsWithLimitInfo() {
      return pool
        .any(
          psql`/* getGetOrganizationsAndTargetsWithLimitInfo */
            SELECT
              o.id as organization,
              o.clean_id as org_clean_id,
              o.name as org_name,
              o.limit_operations_monthly,
              o.limit_retention_days,
              o.plan_name as org_plan_name,
              array_agg(DISTINCT t.id)
                FILTER (WHERE t.id IS NOT NULL)
                as targets,
              split_part(
                string_agg(
                  DISTINCT u.email, ','
                ),
                ',',
                1
              ) AS owner_email
            FROM organizations AS o
            LEFT JOIN projects AS p ON (p.org_id = o.id)
            LEFT JOIN targets as t ON (t.project_id = p.id)
            LEFT JOIN users AS u ON (u.id = o.user_id)
            GROUP BY o.id
          `,
        )
        .then(
          z.array(
            z.object({
              organization: z.string(),
              org_name: z.string(),
              org_clean_id: z.string(),
              org_plan_name: z.string(),
              owner_email: z.string(),
              targets: z
                .array(z.string())
                .nullable()
                .transform(value => value ?? []),
              limit_operations_monthly: z.number(),
              limit_retention_days: z.number(),
            }),
          ).parse,
        );
    },
    async adminGetStats(period: { from: Date; to: Date }) {
      // count schema versions by organization
      const versionsResult = pool
        .any(
          psql`/* adminCountSchemaVersionsByOrg */
        SELECT
          COUNT(*) as total,
          o.id
        FROM schema_versions AS v
        LEFT JOIN targets AS t ON (t.id = v.target_id)
        LEFT JOIN projects AS p ON (p.id = t.project_id)
        LEFT JOIN organizations AS o ON (o.id = p.org_id)
        WHERE
          v.created_at >= ${period.from.toISOString()}
          AND
          v.created_at < ${period.to.toISOString()}
        GROUP by o.id
      `,
        )
        .then(z.array(OrganizationStatModel).parse);

      // count users by organization
      const usersResult = pool
        .any(
          psql`/* adminCountUsersByOrg */
        SELECT
          COUNT(*) as total,
          o.id
        FROM organization_member AS om
        LEFT JOIN organizations AS o ON (o.id = om.organization_id)
        GROUP by o.id
      `,
        )
        .then(z.array(OrganizationStatModel).parse);

      // count projects by organization
      const projectsResult = pool
        .any(
          psql`/* adminCountProjectsByOrg */
        SELECT
          COUNT(*) as total,
          o.id
        FROM projects AS p
        LEFT JOIN organizations AS o ON (o.id = p.org_id)
        GROUP by o.id
      `,
        )
        .then(z.array(OrganizationStatModel).parse);

      // count targets by organization
      const targetsResult = pool
        .any(
          psql`/* adminCountTargetsByOrg */
        SELECT
          COUNT(*) as total,
          o.id
        FROM targets AS t
        LEFT JOIN projects AS p ON (p.id = t.project_id)
        LEFT JOIN organizations AS o ON (o.id = p.org_id)
        GROUP by o.id
      `,
        )
        .then(z.array(OrganizationStatModel).parse);

      // get organizations data
      const organizationsResult = pool
        .any(
          psql`/* adminGetOrganizations */
        SELECT ${organizationFields(psql``)} FROM organizations
      `,
        )
        .then(z.array(OrganizationModel).parse);

      const [versions, users, projects, targets, organizations] = await Promise.all([
        versionsResult,
        usersResult,
        projectsResult,
        targetsResult,
        organizationsResult,
      ]);

      const rows: Array<{
        organization: Organization;
        versions: number;
        users: number;
        projects: number;
        targets: number;
        persistedOperations: number;
        period: {
          from: Date;
          to: Date;
        };
      }> = [];

      function extractTotal<
        T extends {
          total: number;
          id: string;
        },
      >(nodes: readonly T[], id: string) {
        return nodes.find(node => node.id === id)?.total ?? 0;
      }

      for (const organization of organizations) {
        rows.push({
          organization,
          versions: extractTotal(versions, organization.id),
          users: extractTotal(users, organization.id),
          projects: extractTotal(projects, organization.id),
          targets: extractTotal(targets, organization.id),
          persistedOperations: 0,
          period,
        });
      }

      return rows;
    },
    async getBaseSchema({ projectId: project, targetId: target }) {
      const data = await pool
        .maybeOne(
          psql`/* getBaseSchema */ SELECT base_schema FROM targets WHERE id=${target} AND project_id=${project}`,
        )
        .then(z.object({ base_schema: z.string().nullable() }).nullable().parse);
      return data?.base_schema ?? null;
    },
    async updateBaseSchema({ projectId: project, targetId: target }, base) {
      if (base) {
        await pool.query(
          psql`/* updateBaseSchema */ UPDATE targets SET base_schema = ${base} WHERE id = ${target} AND project_id = ${project}`,
        );
      } else {
        await pool.query(
          psql`/* resetBaseSchema */ UPDATE targets SET base_schema = null WHERE id = ${target} AND project_id = ${project}`,
        );
      }
    },
    async getBillingParticipants() {
      const results = await pool
        .any(
          psql`/* getBillingParticipants */
          SELECT
            "organization_id" AS "organizationId",
            "external_billing_reference_id" AS "externalBillingReference",
            "billing_email_address" AS "billingEmailAddress"
          FROM organizations_billing`,
        )
        .then(z.array(OrganizationBillingModel).parse);

      return results;
    },
    async getOrganizationBilling(selector) {
      const results = await pool
        .any(
          psql`/* getOrganizationBilling */
          SELECT
            "organization_id" AS "organizationId",
            "external_billing_reference_id" AS "externalBillingReference",
            "billing_email_address" AS "billingEmailAddress"
          FROM organizations_billing
          WHERE organization_id = ${selector.organizationId}`,
        )
        .then(z.array(OrganizationBillingModel).parse);

      return results[0] || null;
    },
    async deleteOrganizationBilling(selector) {
      await pool.any(
        psql`/* deleteOrganizationBilling */
          DELETE FROM organizations_billing
          WHERE organization_id = ${selector.organizationId}`,
      );
    },
    async createOrganizationBilling({
      billingEmailAddress,
      organizationId,
      externalBillingReference,
    }) {
      return OrganizationBillingModel.parse(
        await pool.maybeOne(
          psql`/* createOrganizationBilling */
            INSERT INTO organizations_billing
              ("organization_id", "external_billing_reference_id", "billing_email_address")
            VALUES
              (${organizationId}, ${externalBillingReference}, ${billingEmailAddress || null})
            RETURNING
              "organization_id" AS "organizationId",
              "external_billing_reference_id" AS "externalBillingReference",
              "billing_email_address" AS "billingEmailAddress"
          `,
        ),
      );
    },
    async completeGetStartedStep({ organizationId: organization, step }) {
      await update(
        pool.getSlonikPool(),
        'organizations',
        {
          [organizationGetStartedMapping[step]]: true,
        },
        {
          id: organization,
        },
      );
    },

    async getOIDCIntegrationById({ oidcIntegrationId: integrationId }) {
      return await pool
        .maybeOne(
          psql`/* getOIDCIntegrationById */
        SELECT
          ${oidcIntegrationFields()}
        FROM
          "oidc_integrations"
        WHERE
          "id" = ${integrationId}
        LIMIT 1
      `,
        )
        .then(OIDCIntegrationModel.nullable().parse);
    },

    getOIDCIntegrationForOrganization: batch(async selectors => {
      const rows = await pool
        .any(
          psql`/* getOIDCIntegrationForOrganization */
        SELECT
          ${oidcIntegrationFields()}
        FROM
          "oidc_integrations"
        WHERE
          "linked_organization_id" = ANY(${psql.array(
            selectors.map(s => s.organizationId),
            'uuid',
          )})
      `,
        )
        .then(z.array(OIDCIntegrationModel).parse);
      const integrations = new Map(
        rows.map(integration => {
          return [integration.linkedOrganizationId, integration] as const;
        }),
      );

      return selectors.map(async s => integrations.get(s.organizationId) ?? null);
    }),

    async getOIDCIntegrationIdForOrganizationSlug({ slug }) {
      const id = await pool
        .maybeOneFirst(
          psql`/* getOIDCIntegrationIdForOrganizationSlug */
          SELECT
            "id"
          FROM
            "oidc_integrations"
          WHERE
            "linked_organization_id" = (
              SELECT "id"
              FROM "organizations"
              WHERE "clean_id" = ${slug}
              LIMIT 1
            )
          LIMIT 1
        `,
        )
        .then(z.string().nullable().parse);

      return id;
    },

    async createOIDCIntegrationForOrganization(args) {
      try {
        const oidcIntegration = await pool
          .maybeOne(
            psql`/* createOIDCIntegrationForOrganization */
          INSERT INTO "oidc_integrations" (
            "linked_organization_id",
            "client_id",
            "client_secret",
            "token_endpoint",
            "userinfo_endpoint",
            "authorization_endpoint",
            "additional_scopes"
          )
          VALUES (
            ${args.organizationId},
            ${args.clientId},
            ${args.encryptedClientSecret},
            ${args.tokenEndpoint},
            ${args.userinfoEndpoint},
            ${args.authorizationEndpoint},
            ${psql.array(args.additionalScopes, 'text')}
          )
          RETURNING
            ${oidcIntegrationFields()}
        `,
          )
          .then(OIDCIntegrationModel.parse);

        return {
          type: 'ok',
          oidcIntegration,
        };
      } catch (error) {
        if (
          error instanceof UniqueIntegrityConstraintViolationError &&
          error.constraint === 'oidc_integrations_linked_organization_id_key'
        ) {
          return {
            type: 'error',
            reason: 'An OIDC integration already exists for this organization.',
          };
        }
        throw error;
      }
    },

    async updateOIDCIntegration(args) {
      return await pool
        .maybeOne(
          psql`/* updateOIDCIntegration */
        UPDATE "oidc_integrations"
        SET
          "client_id" = ${args.clientId ?? psql`"client_id"`}
          , "client_secret" = ${args.encryptedClientSecret ?? psql`"client_secret"`}
          , "token_endpoint" = ${
            args.tokenEndpoint ??
            /** update existing columns to the old legacy values if not yet stored */
            psql`COALESCE("token_endpoint", CONCAT("oauth_api_url", "/token"))`
          }
          , "userinfo_endpoint" = ${
            args.userinfoEndpoint ??
            /** update existing columns to the old legacy values if not yet stored */
            psql`COALESCE("userinfo_endpoint", CONCAT("oauth_api_url", "/userinfo"))`
          }
          , "authorization_endpoint" = ${
            args.authorizationEndpoint ??
            /** update existing columns to the old legacy values if not yet stored */
            psql`COALESCE("authorization_endpoint", CONCAT("oauth_api_url", "/authorize"))`
          }
          , "additional_scopes" = ${args.additionalScopes ? psql.array(args.additionalScopes, 'text') : psql`"additional_scopes"`}
          , "oauth_api_url" = NULL
        WHERE
          "id" = ${args.oidcIntegrationId}
        RETURNING
          ${oidcIntegrationFields()}
      `,
        )
        .then(OIDCIntegrationModel.parse);
    },

    async updateOIDCRestrictions(args) {
      return await pool
        .maybeOne(
          psql`/* updateOIDCRestrictions */
          UPDATE "oidc_integrations"
          SET
            "oidc_user_join_only" = ${args.oidcUserJoinOnly ?? psql`"oidc_user_join_only"`}
            , "oidc_user_access_only" = ${args.oidcUserAccessOnly ?? psql`"oidc_user_access_only"`}
            , "require_invitation" = ${args.requireInvitation ?? psql`"require_invitation"`}
          WHERE
            "id" = ${args.oidcIntegrationId}
          RETURNING
           ${oidcIntegrationFields()}
      `,
        )
        .then(OIDCIntegrationModel.parse);
    },

    async updateOIDCDefaultAssignedResources(args) {
      return pool.transaction('updateOIDCDefaultAssignedResources', async trx => {
        return await trx
          .maybeOne(
            psql`/* updateOIDCDefaultAssignedResources */
          UPDATE "oidc_integrations"
          SET
            "default_assigned_resources" = ${psql.jsonb(args.assignedResources)}
          WHERE
            "id" = ${args.oidcIntegrationId}
          RETURNING
            ${oidcIntegrationFields()}
        `,
          )
          .then(OIDCIntegrationModel.parse);
      });
    },

    async updateOIDCDefaultMemberRole(args) {
      return pool.transaction('updateOIDCDefaultMemberRole', async trx => {
        // Make sure the role exists and is associated with the organization
        const roleId = await trx
          .oneFirst(
            psql`/* checkRoleExists */
            SELECT id FROM "organization_member_roles"
            WHERE
              "id" = ${args.roleId} AND
              "organization_id" = (
                SELECT "linked_organization_id" FROM "oidc_integrations" WHERE "id" = ${args.oidcIntegrationId}
              )
          `,
          )
          .then(z.string().parse);

        if (!roleId) {
          throw new Error('Role does not exist');
        }

        return await pool
          .maybeOne(
            psql`/* updateOIDCDefaultMemberRole */
          UPDATE "oidc_integrations"
          SET
            "default_role_id" = ${roleId}
          WHERE
            "id" = ${args.oidcIntegrationId}
          RETURNING
            ${oidcIntegrationFields()}
        `,
          )
          .then(OIDCIntegrationModel.parse);
      });
    },

    async deleteOIDCIntegration(args) {
      await pool.any(psql`/* deleteOIDCIntegration */
        DELETE FROM "oidc_integrations"
        WHERE
          "id" = ${args.oidcIntegrationId}
      `);
    },

    async createCDNAccessToken(args) {
      return await pool
        .maybeOne(
          psql`/* createCDNAccessToken */
        INSERT INTO "cdn_access_tokens" (
          "id"
          , "target_id"
          , "s3_key"
          , "first_characters"
          , "last_characters"
          , "alias"
        )
        VALUES (
          ${args.id}
          , ${args.targetId}
          , ${args.s3Key}
          , ${args.firstCharacters}
          , ${args.lastCharacters}
          , ${args.alias}
        )
        ON CONFLICT ("s3_key") DO NOTHING
        RETURNING
          ${cdnAccessTokenFields()}
      `,
        )
        .then(CDNAccessTokenModel.nullable().parse);
    },

    async getCDNAccessTokenById(args) {
      return await pool
        .maybeOne(
          psql`/* getCDNAccessTokenById */
        SELECT
          ${cdnAccessTokenFields()}
        FROM
          "cdn_access_tokens"
        WHERE
          "id" = ${args.cdnAccessTokenId}
      `,
        )
        .then(CDNAccessTokenModel.nullable().parse);
    },

    async deleteCDNAccessToken(args) {
      const result = await pool.maybeOne(psql`/* deleteCDNAccessToken */
        DELETE
        FROM
          "cdn_access_tokens"
        WHERE
          "id" = ${args.cdnAccessTokenId}
        RETURNING
          "id"
      `);

      return result != null;
    },

    async getPaginatedCDNAccessTokensForTarget(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      const result = await pool
        .any(
          psql`/* getPaginatedCDNAccessTokensForTarget */
        SELECT
          ${cdnAccessTokenFields()}
        FROM
          "cdn_access_tokens"
        WHERE
          "target_id" = ${args.targetId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    "cdn_access_tokens"."created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "cdn_access_tokens"."created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
        ORDER BY
          "target_id" ASC
          , "cdn_access_tokens"."created_at" DESC
          , "id" DESC
        LIMIT ${limit + 1}
      `,
        )
        .then(z.array(CDNAccessTokenModel).parse);

      let items = result.map(node => {
        return {
          node,
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = items.length > limit;

      items = items.slice(0, limit);

      return {
        items,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return items[items.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return items[0]?.cursor ?? '';
          },
        },
      };
    },

    async setSchemaPolicyForOrganization(input) {
      return pool
        .maybeOne(
          psql`/* setSchemaPolicyForOrganization */
        INSERT INTO "schema_policy_config"
        ("resource_type", "resource_id", "config", "allow_overriding")
          VALUES ('ORGANIZATION', ${input.organizationId}, ${psql.jsonb(input.policy)}, ${
            input.allowOverrides
          })
        ON CONFLICT
          (resource_type, resource_id)
        DO UPDATE
          SET "config" = ${psql.jsonb(input.policy)},
              "allow_overriding" = ${input.allowOverrides},
              "updated_at" = now()
        RETURNING ${schemaPolicyFields(psql``)};
      `,
        )
        .then(SchemaPolicyModel.parse);
    },
    async setSchemaPolicyForProject(input) {
      return pool
        .maybeOne(
          psql`/* setSchemaPolicyForProject */
      INSERT INTO "schema_policy_config"
      ("resource_type", "resource_id", "config")
        VALUES ('PROJECT', ${input.projectId}, ${psql.jsonb(input.policy)})
      ON CONFLICT
        (resource_type, resource_id)
      DO UPDATE
        SET "config" = ${psql.jsonb(input.policy)},
            "updated_at" = now()
      RETURNING ${schemaPolicyFields(psql``)};
    `,
        )
        .then(SchemaPolicyModel.parse);
    },
    async findInheritedPolicies(selector) {
      const { organizationId: organization, projectId: project } = selector;

      return pool
        .any(
          psql`/* findInheritedPolicies */
        SELECT ${schemaPolicyFields(psql``)}
        FROM
          "schema_policy_config"
        WHERE
          ("resource_type" = 'ORGANIZATION' AND "resource_id" = ${organization})
          OR ("resource_type" = 'PROJECT' AND "resource_id" = ${project});
      `,
        )
        .then(z.array(SchemaPolicyModel).parse);
    },
    async getSchemaPolicyForOrganization(organizationId: string) {
      return pool
        .maybeOne(
          psql`/* getSchemaPolicyForOrganization */
        SELECT ${schemaPolicyFields(psql``)}
        FROM
          "schema_policy_config"
        WHERE
          "resource_type" = 'ORGANIZATION'
          AND "resource_id" = ${organizationId};
      `,
        )
        .then(SchemaPolicyModel.nullable().parse);
    },
    async getSchemaPolicyForProject(projectId: string) {
      return pool
        .maybeOne(
          psql`/* getSchemaPolicyForProject */
      SELECT ${schemaPolicyFields(psql``)}
      FROM
        "schema_policy_config"
      WHERE
        "resource_type" = 'PROJECT'
        AND "resource_id" = ${projectId};
    `,
        )
        .then(SchemaPolicyModel.nullable().parse);
    },
    async getPaginatedDocumentCollectionsForTarget(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      const result = await pool.any(psql`/* getPaginatedDocumentCollectionsForTarget */
        SELECT
          "id"
          , "title"
          , "description"
          , "target_id" as "targetId"
          , "created_by_user_id" as "createdByUserId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
        FROM
          "document_collections"
        WHERE
          "target_id" = ${args.targetId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
        ORDER BY
          "target_id" ASC
          , "created_at" DESC
          , "id" DESC
        LIMIT ${limit + 1}
      `);

      let items = result.map(row => {
        const node = DocumentCollectionModel.parse(row);

        return {
          node,
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = items.length > limit;

      items = items.slice(0, limit);

      return {
        edges: items,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return items[items.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return items[0]?.cursor ?? '';
          },
        },
      };
    },

    async createDocumentCollection(args) {
      const result = await pool.maybeOne(psql`/* createDocumentCollection */
        INSERT INTO "document_collections" (
          "title"
          , "description"
          , "target_id"
          , "created_by_user_id"
        )
        VALUES (
          ${args.title},
          ${args.description},
          ${args.targetId},
          ${args.createdByUserId}
        )
        RETURNING
          "id"
          , "title"
          , "description"
          , "target_id" as "targetId"
          , "created_by_user_id" as "createdByUserId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
      `);

      return DocumentCollectionModel.parse(result);
    },
    async deleteDocumentCollection(args) {
      const result = await pool.maybeOneFirst(psql`/* deleteDocumentCollection */
        DELETE
        FROM
          "document_collections"
        WHERE
          "id" = ${args.documentCollectionId}
        RETURNING
          "id"
      `);

      if (result == null) {
        return null;
      }

      return z.string().parse(result);
    },

    async updateDocumentCollection(args) {
      const result = await pool.maybeOne(psql`/* updateDocumentCollection */
        UPDATE
          "document_collections"
        SET
          "title" = COALESCE(${args.title}, "title")
          , "description" = COALESCE(${args.description}, "description")
          , "updated_at" = NOW()
        WHERE
          "id" = ${args.documentCollectionId}
        RETURNING
          "id"
          , "title"
          , "description"
          , "target_id" as "targetId"
          , "created_by_user_id" as "createdByUserId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
      `);

      if (result == null) {
        return null;
      }

      return DocumentCollectionModel.parse(result);
    },

    async getPaginatedDocumentsForDocumentCollection(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      // hard-coded max to prevent abuse (just in case, it's part of persisted operations anyway)
      const max = 200;
      const first = args.first && args.first > 0 ? args.first : max;
      const limit = Math.min(first, max);

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      const result = await pool.any(psql`/* getPaginatedDocumentsForDocumentCollection */
        SELECT
          "id"
          , "title"
          , "contents"
          , "variables"
          , "headers"
          , "created_by_user_id" as "createdByUserId"
          , "document_collection_id" as "documentCollectionId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
        FROM
          "document_collection_documents"
        WHERE
          "document_collection_id" = ${args.documentCollectionId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
        ORDER BY
          "document_collection_id" ASC
          , "created_at" DESC
          , "id" DESC
        LIMIT ${limit + 1}
      `);

      let items = result.map(row => {
        const node = DocumentCollectionDocumentModel.parse(row);

        return {
          node,
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = items.length > limit;

      items = items.slice(0, limit);

      return {
        edges: items,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return items[items.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return items[0]?.cursor ?? '';
          },
        },
      };
    },

    async createDocumentCollectionDocument(args) {
      const result = await pool.maybeOne(psql`/* createDocumentCollectionDocument */
        INSERT INTO "document_collection_documents" (
          "title"
          , "contents"
          , "variables"
          , "headers"
          , "created_by_user_id"
          , "document_collection_id"
        )
        VALUES (
          ${args.title}
          , ${args.contents}
          , ${args.variables}
          , ${args.headers}
          , ${args.createdByUserId}
          , ${args.documentCollectionId}
        )
        RETURNING
          "id"
          , "title"
          , "contents"
          , "variables"
          , "headers"
          , "created_by_user_id" as "createdByUserId"
          , "document_collection_id" as "documentCollectionId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
      `);

      return DocumentCollectionDocumentModel.parse(result);
    },

    async deleteDocumentCollectionDocument(args) {
      const result = await pool.maybeOneFirst(psql`/* deleteDocumentCollectionDocument */
        DELETE
        FROM
          "document_collection_documents"
        WHERE
          "id" = ${args.documentCollectionDocumentId}
        RETURNING
          "id"
      `);

      if (result == null) {
        return null;
      }

      return z.string().parse(result);
    },

    async getDocumentCollectionDocument(args) {
      const result = await pool.maybeOne(psql`/* getDocumentCollectionDocument */
        SELECT
          "id"
          , "title"
          , "contents"
          , "variables"
          , "headers"
          , "created_by_user_id" as "createdByUserId"
          , "document_collection_id" as "documentCollectionId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
        FROM
          "document_collection_documents"
        WHERE
          "id" = ${args.id}
      `);

      if (result === null) {
        return null;
      }

      return DocumentCollectionDocumentModel.parse(result);
    },

    async getDocumentCollection(args) {
      const result = await pool.maybeOne(psql`/* getDocumentCollection */
        SELECT
          "id"
          , "title"
          , "description"
          , "target_id" as "targetId"
          , "created_by_user_id" as "createdByUserId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
        FROM
          "document_collections"
        WHERE
          "id" = ${args.id}
      `);

      if (result === null) {
        return null;
      }

      return DocumentCollectionModel.parse(result);
    },

    async updateDocumentCollectionDocument(args) {
      const result = await pool.maybeOne(psql`/* updateDocumentCollectionDocument */
        UPDATE
          "document_collection_documents"
        SET
          "title" = COALESCE(${args.title}, "title")
          , "contents" = COALESCE(${args.contents}, "contents")
          , "variables" = COALESCE(${args.variables}, "variables")
          , "headers" = COALESCE(${args.headers}, "headers")
          , "updated_at" = NOW()
        WHERE
          "id" = ${args.documentCollectionDocumentId}
        RETURNING
          "id"
          , "title"
          , "contents"
          , "variables"
          , "headers"
          , "created_by_user_id" as "createdByUserId"
          , "document_collection_id" as "documentCollectionId"
          , to_json("created_at") as "createdAt"
          , to_json("updated_at") as "updatedAt"
      `);

      if (result === null) {
        return null;
      }

      return DocumentCollectionDocumentModel.parse(result);
    },

    async createSchemaCheck(args) {
      const result = await pool.transaction('createSchemaCheck', async trx => {
        const sdlStoreInserts: Array<Promise<unknown>> = [];

        function insertSdl(hash: string, sdl: string) {
          return trx.any(psql`/* insertToSdlStore */
            INSERT INTO "sdl_store" (id, sdl)
            VALUES (${hash}, ${sdl})
            ON CONFLICT (id) DO NOTHING;
          `);
        }

        const schemaSDLHash = createSDLHash(args.schemaSDL);
        let compositeSchemaSDLHash: string | null = null;
        let supergraphSDLHash: string | null = null;

        sdlStoreInserts.push(insertSdl(schemaSDLHash, args.schemaSDL));

        if (args.compositeSchemaSDL) {
          compositeSchemaSDLHash = createSDLHash(args.compositeSchemaSDL);
          sdlStoreInserts.push(insertSdl(compositeSchemaSDLHash, args.compositeSchemaSDL));
        }

        if (args.supergraphSDL) {
          supergraphSDLHash = createSDLHash(args.supergraphSDL);
          sdlStoreInserts.push(insertSdl(supergraphSDLHash, args.supergraphSDL));
        }

        await Promise.all(sdlStoreInserts);

        const schemaCheck = await trx
          .maybeOne(
            psql`/* createSchemaCheck */
          INSERT INTO "schema_checks" (
              "schema_sdl_store_id"
            , "service_name"
            , "service_url"
            , "meta"
            , "target_id"
            , "schema_version_id"
            , "is_success"
            , "schema_composition_errors"
            , "breaking_schema_changes"
            , "safe_schema_changes"
            , "schema_policy_warnings"
            , "schema_policy_errors"
            , "composite_schema_sdl_store_id"
            , "supergraph_sdl_store_id"
            , "is_manually_approved"
            , "manual_approval_user_id"
            , "github_check_run_id"
            , "github_repository"
            , "github_sha"
            , "expires_at"
            , "context_id"
            , "has_contract_schema_changes"
            , "conditional_breaking_change_metadata"
            , "schema_proposal_id"
            , "schema_proposal_changes"
          )
          VALUES (
              ${schemaSDLHash}
            , ${args.serviceName}
            , ${args.serviceUrl}
            , ${jsonify(args.meta)}
            , ${args.targetId}
            , ${args.schemaVersionId}
            , ${args.isSuccess}
            , ${jsonify(args.schemaCompositionErrors)}
            , ${jsonify(args.breakingSchemaChanges?.map(toSerializableSchemaChange))}
            , ${jsonify(args.safeSchemaChanges?.map(toSerializableSchemaChange))}
            , ${jsonify(args.schemaPolicyWarnings?.map(w => SchemaPolicyWarningModel.parse(w)))}
            , ${jsonify(args.schemaPolicyErrors?.map(w => SchemaPolicyWarningModel.parse(w)))}
            , ${compositeSchemaSDLHash}
            , ${supergraphSDLHash}
            , ${args.isManuallyApproved}
            , ${args.manualApprovalUserId}
            , ${args.githubCheckRunId}
            , ${args.githubRepository}
            , ${args.githubSha}
            , ${args.expiresAt?.toISOString() ?? null}
            , ${args.contextId}
            , ${
              args.contracts?.some(
                c => c.breakingSchemaChanges?.length || c.safeSchemaChanges?.length,
              ) ?? false
            }
            , ${jsonify(InsertConditionalBreakingChangeMetadataModel.parse(args.conditionalBreakingChangeMetadata))}
            , ${args.schemaProposalId ?? null}
            , ${jsonify(args.schemaProposalChanges?.map(toSerializableSchemaChange))}
          )
          RETURNING
            "id"
        `,
          )
          .then(z.object({ id: z.string() }).parse);

        if (args.contracts?.length) {
          for (const contract of args.contracts) {
            let supergraphSchemaSdlHash: string | null = null;
            let compositeSchemaSdlHash: string | null = null;

            if (contract.supergraphSchemaSdl) {
              supergraphSchemaSdlHash = createSDLHash(contract.supergraphSchemaSdl);
              await insertSdl(supergraphSchemaSdlHash, contract.supergraphSchemaSdl);
            }

            if (contract.compositeSchemaSdl) {
              compositeSchemaSdlHash = createSDLHash(contract.compositeSchemaSdl);
              await insertSdl(compositeSchemaSdlHash, contract.compositeSchemaSdl);
            }

            await trx.query(psql`/* createContractChecks */
              INSERT INTO "contract_checks" (
                "schema_check_id"
                , "compared_contract_version_id"
                , "is_success"
                , "contract_id"
                , "composite_schema_sdl_store_id"
                , "supergraph_sdl_store_id"
                , "schema_composition_errors"
                , "breaking_schema_changes"
                , "safe_schema_changes"
              )
              VALUES (
                ${schemaCheck.id}
                , ${contract.comparedContractVersionId}
                , ${contract.isSuccess}
                , ${contract.contractId}
                , ${compositeSchemaSdlHash}
                , ${supergraphSchemaSdlHash}
                , ${jsonify(contract.schemaCompositionErrors)}
                , ${jsonify(contract.breakingSchemaChanges?.map(toSerializableSchemaChange))}
                , ${jsonify(contract.safeSchemaChanges?.map(toSerializableSchemaChange))}
              )
            `);
          }
        }

        return schemaCheck;
      });

      const check = await this.findSchemaCheck({
        targetId: args.targetId,
        schemaCheckId: result.id,
      });

      if (!check) {
        throw new Error('Failed to fetch newly created schema check');
      }

      return check;
    },
    async findSchemaCheck(args) {
      const result = await pool.maybeOne(psql`/* findSchemaCheck */
        SELECT
          ${schemaCheckSQLFields}
        FROM
          "schema_checks" as c
        LEFT JOIN "sdl_store" as s_schema            ON s_schema."id" = c."schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_composite_schema  ON s_composite_schema."id" = c."composite_schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_supergraph        ON s_supergraph."id" = c."supergraph_sdl_store_id"
        WHERE
          c."id" = ${args.schemaCheckId}
          AND c."target_id" = ${args.targetId}
      `);

      if (result == null) {
        return null;
      }

      return SchemaCheckModel.parse(result);
    },
    async approveFailedSchemaCheck(args) {
      const schemaCheck = await this.findSchemaCheck({
        targetId: args.targetId,
        schemaCheckId: args.schemaCheckId,
      });

      if (!schemaCheck) {
        return null;
      }

      // We enhance the approved schema checks with some metadata
      const approvalMetadata: SchemaCheckApprovalMetadata = {
        userId: args.userId,
        date: new Date().toISOString(),
        schemaCheckId: schemaCheck.id,
        author: args.author ?? undefined,
      };

      if (schemaCheck.contextId !== null && !!schemaCheck.breakingSchemaChanges) {
        // Try to approve and claim all the breaking schema changes for this context
        await pool.query(psql`/* approveFailedSchemaCheck */
          INSERT INTO "schema_change_approvals" (
            "target_id"
            , "context_id"
            , "schema_change_id"
            , "schema_change"
          )
          SELECT * FROM ${psql.unnest(
            schemaCheck.breakingSchemaChanges
              .filter(change => !change.isSafeBasedOnUsage)
              .map(change => [
                schemaCheck.targetId,
                schemaCheck.contextId,
                change.id,
                JSON.stringify(
                  toSerializableSchemaChange({
                    ...change,
                    // We enhance the approved schema changes with some metadata that can be displayed on the UI
                    approvalMetadata,
                  }),
                ),
              ]),
            ['uuid', 'text', 'text', 'jsonb'],
          )}
          ON CONFLICT ("target_id", "context_id", "schema_change_id") DO NOTHING
        `);
      }

      const didUpdateContractChecks = await args.contracts.approveContractChecksForSchemaCheckId({
        schemaCheckId: schemaCheck.id,
        approvalMetadata,
        contextId: schemaCheck.contextId,
      });

      let updateResult: {
        id: string;
      } | null = null;

      if (schemaCheck.breakingSchemaChanges) {
        updateResult = await pool
          .maybeOne(
            psql`/* approveFailedSchemaCheck (breakingSchemaChanges) */
            UPDATE
              "schema_checks"
            SET
              "is_success" = true
              , "is_manually_approved" = true
              , "manual_approval_user_id" = ${args.userId}
              , "manual_approval_comment" = ${args.comment ?? null}
              , "breaking_schema_changes" = (
                SELECT json_agg(
                  CASE
                    WHEN (COALESCE(jsonb_typeof("change"->'approvalMetadata'), 'null') = 'null' AND "change"->>'isSafeBasedOnUsage' = 'false')
                      THEN jsonb_set("change", '{approvalMetadata}', ${psql.jsonb(approvalMetadata)})
                    ELSE "change"
                  END
                )
                FROM jsonb_array_elements("breaking_schema_changes") AS "change"
              )
            WHERE
              "id" = ${args.schemaCheckId}
              AND "is_success" = false
              AND "schema_composition_errors" IS NULL
              AND "schema_policy_errors" IS NULL
            RETURNING
              "id"
          `,
          )
          .then(z.object({ id: z.string() }).nullable().parse);
      } else if (didUpdateContractChecks) {
        updateResult = await pool
          .maybeOne(
            psql`/* approveFailedSchemaCheck (didUpdateContractChecks) */
            UPDATE
              "schema_checks"
            SET
              "is_success" = true
              , "is_manually_approved" = true
              , "manual_approval_comment" = ${args.comment ?? null}
              , "manual_approval_user_id" = ${args.userId}
            WHERE
              "id" = ${args.schemaCheckId}
              AND "is_success" = false
              AND "schema_composition_errors" IS NULL
              AND "schema_policy_errors" IS NULL
            RETURNING
              "id"
          `,
          )
          .then(z.object({ id: z.string() }).nullable().parse);
      }

      if (updateResult == null) {
        return null;
      }

      const result = await pool.maybeOne(psql`/* getApprovedSchemaCheck */
        SELECT
          ${schemaCheckSQLFields}
        FROM
          "schema_checks" as c
        LEFT JOIN "sdl_store" as s_schema            ON s_schema."id" = c."schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_composite_schema  ON s_composite_schema."id" = c."composite_schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_supergraph        ON s_supergraph."id" = c."supergraph_sdl_store_id"
        WHERE
          c."id" = ${updateResult.id}
      `);

      return SchemaCheckModel.parse(result);
    },
    async getApprovedSchemaChangesForContextId(args) {
      const result = await pool.anyFirst(psql`/* getApprovedSchemaChangesForContextId */
        SELECT
          "schema_change"
        FROM
          "schema_change_approvals"
        WHERE
          "target_id" = ${args.targetId}
          AND "context_id" = ${args.contextId}
      `);

      const approvedSchemaChanges = new Map<string, SchemaChangeType>();
      for (const record of result) {
        const change = HiveSchemaChangeModel.parse(record);
        approvedSchemaChanges.set(change.id, change);
      }
      return approvedSchemaChanges;
    },
    async getPaginatedSchemaChecksForTarget(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

      const { failed, changed } = args.filters ?? {};

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      const result = await pool.any(psql`/* getPaginatedSchemaChecksForTarget */
        SELECT
          ${schemaCheckSQLFields}
        FROM
          "schema_checks" as c
        LEFT JOIN "sdl_store" as s_schema            ON s_schema."id" = c."schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_composite_schema  ON s_composite_schema."id" = c."composite_schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_supergraph        ON s_supergraph."id" = c."supergraph_sdl_store_id"
        WHERE
          c."target_id" = ${args.targetId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    c."created_at" = ${cursor.createdAt}
                    AND c."id" < ${cursor.id}
                  )
                  OR c."created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
          ${
            failed
              ? psql`
                AND (
                  "is_success" = false
                )
              `
              : psql``
          }
          ${
            changed
              ? psql`
                AND (
                  jsonb_typeof("safe_schema_changes") = 'array'
                  OR jsonb_typeof("breaking_schema_changes") = 'array'
                  OR "has_contract_schema_changes" = true
                )
              `
              : psql``
          }
        ORDER BY
          c."target_id" ASC
          , c."created_at" DESC
          , c."id" DESC
        LIMIT ${limit + 1}
      `);

      let items = result.map(row => {
        const node = SchemaCheckModel.parse(row);

        return {
          get node() {
            // TODO: remove this any cast and fix the type issues...
            return (args.transformNode?.(node) ?? node) as any;
          },
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = items.length > limit;

      items = items.slice(0, limit);

      return {
        items,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return items[items.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return items[0]?.cursor ?? '';
          },
        },
      };
    },

    async getPaginatedSchemaChecksForSchemaProposal(args) {
      let cursor: null | {
        createdAt: string;
        id: string;
      } = null;

      const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      // gets the most recently created schema checks per service name
      const result = await pool.any(psql`/* getPaginatedSchemaChecksForSchemaProposal */
        SELECT
          ${schemaCheckSQLFields}
        FROM
          "schema_checks" as c
        ${
          args.latest
            ? psql`
            INNER JOIN (
              SELECT COALESCE("service_name", '') as "service", "schema_proposal_id", max("created_at") as "maxdate"
              FROM schema_checks
              ${
                cursor
                  ? psql`
                    WHERE "schema_proposal_id" = ${args.proposalId}
                    AND (
                      (
                        "created_at" = ${cursor.createdAt}
                        AND "id" < ${cursor.id}
                      )
                      OR "created_at" < ${cursor.createdAt}
                    )
                  `
                  : psql``
              }
              GROUP BY "service", "schema_proposal_id"
            ) as cc
            ON c."schema_proposal_id" = cc."schema_proposal_id"
              AND COALESCE(c."service_name", '') = cc."service"
              AND c."created_at" = cc."maxdate"
          `
            : psql``
        }
        LEFT JOIN "sdl_store" as s_schema
          ON s_schema."id" = c."schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_composite_schema
          ON s_composite_schema."id" = c."composite_schema_sdl_store_id"
        LEFT JOIN "sdl_store" as s_supergraph
          ON s_supergraph."id" = c."supergraph_sdl_store_id"
        WHERE
          c."schema_proposal_id" = ${args.proposalId}
          ${
            cursor
              ? psql`
                AND (
                  (
                    c."created_at" = ${cursor.createdAt}
                    AND c."id" < ${cursor.id}
                  )
                  OR c."created_at" < ${cursor.createdAt}
                )
              `
              : psql``
          }
        ORDER BY
          c."created_at" DESC
          , c."id" DESC
        LIMIT ${limit + 1}
      `);

      let items = result.map(row => {
        const node = SchemaCheckModel.parse(row);
        return {
          get node() {
            // TODO: remove this any cast and fix the type issues...
            return (args.transformNode?.(node) ?? node) as any;
          },
          get cursor() {
            return encodeCreatedAtAndUUIDIdBasedCursor(node);
          },
        };
      });

      const hasNextPage = items.length > limit;

      items = items.slice(0, limit);

      return {
        edges: items,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: cursor !== null,
          get endCursor() {
            return items[items.length - 1]?.cursor ?? '';
          },
          get startCursor() {
            return items[0]?.cursor ?? '';
          },
        },
      };
    },

    async getTargetBreadcrumbForTargetId(args) {
      const result = await pool.maybeOne(psql`/* getTargetBreadcrumbForTargetId */
        SELECT
          o."clean_id" AS "organization_slug",
          p."clean_id" AS "project_slug",
          t."clean_id" AS "target_slug"
        FROM
          "targets" t
          INNER JOIN "projects" p ON t."project_id" = p."id"
          INNER JOIN "organizations" o ON p."org_id" = o."id"
        WHERE
          t."id" = ${args.targetId}
      `);

      if (result === null) {
        return null;
      }

      return TargetBreadcrumbModel.parse(result);
    },
    getTargetById: batch(async targetIds => {
      const rows = await pool
        .any(
          psql`/* getTarget */
            SELECT
              "t".*
              , "p"."org_id" AS "orgId"
            FROM (
              SELECT
                ${targetSQLFields}
              FROM
                "targets"
              WHERE
                "id" = ANY(${psql.array(targetIds, 'uuid')})
            ) AS "t"
              INNER JOIN "projects" "p" ON "t"."projectId" = "p"."id"
          `,
        )
        .then(z.array(TargetWithOrgIdModel).parse);

      const resultLookupMap = new Map<string, Target>();
      for (const target of rows) {
        resultLookupMap.set(target.id, target);
      }

      return targetIds.map(async id => {
        return resultLookupMap.get(id) ?? null;
      });
    }),

    async updateTargetGraphQLEndpointUrl(args) {
      const result = await pool.maybeOne(psql`/* updateTargetGraphQLEndpointUrl */
        UPDATE
          "targets"
        SET
          "graphql_endpoint_url" = ${args.graphqlEndpointUrl}
        WHERE
          "id" = ${args.targetId}
        RETURNING
          ${targetSQLFields}
      `);

      if (result === null) {
        return null;
      }

      return {
        ...TargetModel.parse(result),
        orgId: args.organizationId,
      };
    },

    async purgeExpiredSchemaChecks(args) {
      const SchemaCheckModel = z.object({
        schemaCheckIds: z.array(z.string()),
        sdlStoreIds: z.array(z.string()),
        contextIds: z.array(z.string()),
        targetIds: z.array(z.string()),
        contractIds: z.array(z.string()),
      });
      return await pool.transaction('purgeExpiredSchemaChecks', async pool => {
        const date = args.expiresAt.toISOString();
        const rawData = await pool.maybeOne(psql`/* findSchemaChecksToPurge */
          WITH "filtered_schema_checks" AS (
            SELECT *
            FROM "schema_checks"
            WHERE "expires_at" <= ${date}
          )
          SELECT
            ARRAY(SELECT "filtered_schema_checks"."id" FROM "filtered_schema_checks") AS "schemaCheckIds",
            ARRAY(SELECT DISTINCT "filtered_schema_checks"."target_id" FROM "filtered_schema_checks") AS "targetIds",
            ARRAY(
              SELECT DISTINCT "filtered_schema_checks"."schema_sdl_store_id"
              FROM "filtered_schema_checks"
              WHERE "filtered_schema_checks"."schema_sdl_store_id" IS NOT NULL

              UNION SELECT DISTINCT "filtered_schema_checks"."composite_schema_sdl_store_id"
              FROM "filtered_schema_checks"
              WHERE "filtered_schema_checks"."composite_schema_sdl_store_id" IS NOT NULL

              UNION SELECT DISTINCT "filtered_schema_checks"."supergraph_sdl_store_id"
              FROM "filtered_schema_checks"
              WHERE "filtered_schema_checks"."supergraph_sdl_store_id" IS NOT NULL

              UNION SELECT DISTINCT "contract_checks"."composite_schema_sdl_store_id"
              FROM "contract_checks"
                INNER JOIN "filtered_schema_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
              WHERE "contract_checks"."composite_schema_sdl_store_id" IS NOT NULL

              UNION SELECT DISTINCT "contract_checks"."supergraph_sdl_store_id" FROM "filtered_schema_checks"
                INNER JOIN "contract_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
                WHERE "contract_checks"."supergraph_sdl_store_id" IS NOT NULL
            ) AS "sdlStoreIds",
            ARRAY(
              SELECT DISTINCT "filtered_schema_checks"."context_id"
              FROM "filtered_schema_checks"
              WHERE "filtered_schema_checks"."context_id" IS NOT NULL
            ) AS "contextIds",
            ARRAY(
              SELECT DISTINCT "contract_checks"."contract_id"
              FROM "contract_checks"
                INNER JOIN "filtered_schema_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
            ) AS "contractIds"
        `);

        const data = SchemaCheckModel.parse(rawData);

        if (!data.schemaCheckIds.length) {
          return {
            deletedSchemaCheckCount: 0,
            deletedSdlStoreCount: 0,
            deletedSchemaChangeApprovalCount: 0,
            deletedContractSchemaChangeApprovalCount: 0,
          };
        }

        let deletedSdlStoreCount = 0;
        let deletedSchemaChangeApprovalCount = 0;
        let deletedContractSchemaChangeApprovalCount = 0;

        await pool.any(psql`/* purgeExpiredSchemaChecks */
          DELETE
          FROM "schema_checks"
          WHERE
            "id" = ANY(${psql.array(data.schemaCheckIds, 'uuid')})
        `);

        if (data.sdlStoreIds.length) {
          deletedSdlStoreCount = await pool
            .oneFirst(
              psql`/* purgeExpiredSdlStore */
            WITH "deleted" AS (
              DELETE
              FROM
                "sdl_store"
              WHERE
                "id" = ANY(
                  ${psql.array(data.sdlStoreIds, 'text')}
                )
                AND NOT EXISTS (
                  SELECT
                    1
                  FROM
                    "schema_checks"
                  WHERE
                    "schema_checks"."schema_sdl_store_id" = "sdl_store"."id"
                    OR "schema_checks"."composite_schema_sdl_store_id" = "sdl_store"."id"
                    OR "schema_checks"."supergraph_sdl_store_id" = "sdl_store"."id"
                )
                AND NOT EXISTS (
                  SELECT
                    1
                  FROM
                    "contract_checks"
                  WHERE
                   "contract_checks"."composite_schema_sdl_store_id" = "sdl_store"."id"
                   OR "contract_checks"."supergraph_sdl_store_id" = "sdl_store"."id"
                )
              RETURNING
                "id"
            ) SELECT COUNT(*) FROM "deleted"
          `,
            )
            .then(z.number().parse);
        }

        if (data.targetIds.length && data.contextIds.length) {
          deletedSchemaChangeApprovalCount = await pool
            .oneFirst(
              psql`/* purgeExpiredSchemaChangeApprovals */
            WITH "deleted" AS (
              DELETE
              FROM
                "schema_change_approvals"
              WHERE
                "target_id" = ANY(
                  ${psql.array(data.targetIds, 'uuid')}
                )
                AND "context_id" = ANY(
                  ${psql.array(data.contextIds, 'text')}
                )
                AND NOT EXISTS (
                  SELECT
                    1
                  FROM "schema_checks"
                  WHERE
                    "schema_checks"."target_id" = "schema_change_approvals"."target_id"
                    AND "schema_checks"."context_id" = "schema_change_approvals"."context_id"
                )
              RETURNING
                "target_id"
            ) SELECT COUNT(*) FROM "deleted"
          `,
            )
            .then(z.number().parse);
        }

        if (data.contractIds.length && data.contextIds.length) {
          deletedContractSchemaChangeApprovalCount = await pool
            .oneFirst(
              psql`/* purgeExpiredContractSchemaChangeApprovals */
            WITH "deleted" AS (
              DELETE
              FROM
                "contract_schema_change_approvals"
              WHERE
                "contract_id" = ANY(
                  ${psql.array(data.contractIds, 'uuid')}
                )
                AND "context_id" = ANY(
                  ${psql.array(data.contextIds, 'text')}
                )
                AND NOT EXISTS (
                  SELECT
                    1
                  FROM
                    "schema_checks"
                      INNER JOIN "contract_checks"
                        ON "contract_checks"."schema_check_id" = "schema_checks"."id"
                  WHERE
                    "contract_checks"."contract_id" = "contract_schema_change_approvals"."contract_id"
                    AND "schema_checks"."context_id" = "contract_schema_change_approvals"."context_id"
                )
              RETURNING
                "contract_id"
            ) SELECT COUNT(*) FROM "deleted"
          `,
            )
            .then(z.number().parse);
        }

        return {
          deletedSchemaCheckCount: data.schemaCheckIds.length,
          deletedSdlStoreCount,
          deletedSchemaChangeApprovalCount,
          deletedContractSchemaChangeApprovalCount,
        };
      });
    },

    async getSchemaVersionByCommit(args) {
      const record = await pool.maybeOne(psql`/* getSchemaVersionByCommit */
        SELECT
          ${schemaVersionSQLFields()}
        FROM
          "schema_versions"
        WHERE
          "action_id" = (
            SELECT
              "id"
            FROM
              "schema_log"
            WHERE
              "schema_log"."project_id" = ${args.projectId}
              AND "schema_log"."target_id" = ${args.targetId}
              AND "schema_log"."commit" = ${args.commit}
            ORDER BY "schema_log"."created_at" DESC
            LIMIT 1
          )
        LIMIT 1
      `);

      if (!record) {
        return null;
      }

      return SchemaVersionModel.parse(record);
    },
    // Zendesk
    async setZendeskOrganizationId({ organizationId, zendeskId }) {
      await pool.query(psql`/* setZendeskOrganizationId */
        UPDATE
          "organizations"
        SET
          "zendesk_organization_id" = ${zendeskId}
        WHERE
          "id" = ${organizationId}
      `);
    },
    async setZendeskUserId({ userId, zendeskId }) {
      await pool.query(psql`/* setZendeskUserId */
        UPDATE
          "users"
        SET
          "zendesk_user_id" = ${zendeskId}
        WHERE
          "id" = ${userId}
      `);
    },
    async setZendeskOrganizationUserConnection({ organizationId, userId }) {
      await pool.query(psql`/* setZendeskOrganizationUserConnection */
        UPDATE
          "organization_member"
        SET
          "connected_to_zendesk" = true
        WHERE
          "organization_id" = ${organizationId}
          AND "user_id" = ${userId}
      `);
    },
    async updateTargetSchemaComposition(args) {
      // I could do it in one query, but the amount of SQL needed to do it in one go is just not worth it...
      // It is just too complex to understand.
      await pool.transaction('updateTargetSchemaComposition', async t => {
        const ff = await t
          .maybeOneFirst(
            psql`/* updateTargetSchemaComposition_select */
          SELECT feature_flags FROM organizations WHERE id = ${args.organizationId};
        `,
          )
          .then(FeatureFlagsModel.parse);

        let modify = false;
        const includesTarget = ff.forceLegacyCompositionInTargets.includes(args.targetId);

        if (args.nativeComposition) {
          // delete from the list of targets that need to be forced to use the legacy composition
          if (includesTarget) {
            ff.forceLegacyCompositionInTargets = ff.forceLegacyCompositionInTargets.filter(
              id => id !== args.targetId,
            );
            modify = true;
          }
        } else {
          // add to the list of targets that need to be forced to use the legacy composition
          if (!includesTarget) {
            ff.forceLegacyCompositionInTargets.push(args.targetId);
            modify = true;
          }
        }

        if (modify) {
          await t.query(psql`/* updateTargetSchemaComposition_update */
            UPDATE organizations
            SET feature_flags = ${psql.jsonb(ff)}
            WHERE id = ${args.organizationId};
          `);
        }
      });

      return this.getTarget({
        targetId: args.targetId,
        projectId: args.projectId,
        organizationId: args.organizationId,
      });
    },
    pool,
  };

  return storage;
}

export function encodeCreatedAtAndUUIDIdBasedCursor(cursor: { createdAt: string; id: string }) {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`).toString('base64');
}

export function decodeCreatedAtAndUUIDIdBasedCursor(cursor: string) {
  const [createdAt, id] = Buffer.from(cursor, 'base64').toString('utf8').split('|');
  if (
    Number.isNaN(Date.parse(createdAt)) ||
    id === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error('Invalid cursor');
  }

  return {
    createdAt,
    id,
  };
}

export function encodeAppDeploymentSortCursor(cursor: {
  sortField: string;
  sortValue: string | null;
  id: string;
}) {
  const value = cursor.sortValue ?? '';
  return Buffer.from(`${cursor.sortField}:${value}|${cursor.id}`).toString('base64');
}

export function decodeAppDeploymentSortCursor(cursor: string) {
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const pipeIndex = decoded.lastIndexOf('|');
  if (pipeIndex === -1) {
    throw new Error('Invalid cursor');
  }
  const id = decoded.slice(pipeIndex + 1);
  const fieldAndValue = decoded.slice(0, pipeIndex);
  const colonIndex = fieldAndValue.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid cursor');
  }
  const sortField = fieldAndValue.slice(0, colonIndex);
  const validSortFields = ['CREATED_AT', 'ACTIVATED_AT', 'LAST_USED'];
  if (!validSortFields.includes(sortField)) {
    throw new Error('Invalid cursor: unknown sort field');
  }

  const sortValue = fieldAndValue.slice(colonIndex + 1) || null;
  if (sortValue !== null && Number.isNaN(new Date(sortValue).getTime())) {
    throw new Error('Invalid cursor: sortValue is not a valid date');
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid cursor');
  }

  return { sortField, sortValue, id };
}

export function encodeHashBasedCursor(cursor: { id: string }) {
  return Buffer.from(cursor.id).toString('base64');
}

export function decodeHashBasedCursor(cursor: string) {
  const id = Buffer.from(cursor, 'base64').toString('utf8');
  return {
    id,
  };
}

export function encodeCreatedAtAndHashBasedCursor(cursor: { createdAt: string; hash: string }) {
  return Buffer.from(`${cursor.createdAt}|${cursor.hash}`).toString('base64');
}

export function decodeCreatedAtAndHashBasedCursor(cursor: string) {
  const [createdAt, hash] = Buffer.from(cursor, 'base64').toString('utf8').split('|');

  return {
    createdAt,
    hash,
  };
}

const OIDCIntegrationBaseModel = z.object({
  id: z.string(),
  linkedOrganizationId: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  additionalScopes: z
    .array(z.string())
    .nullable()
    .transform(value => (value === null ? [] : value)),
  oidcUserJoinOnly: z.boolean(),
  oidcUserAccessOnly: z.boolean(),
  defaultRoleId: z.string().nullable(),
  defaultAssignedResources: z.any().nullable(),
  requireInvitation: z.boolean(),
});

const OIDCIntegrationLegacyModel = OIDCIntegrationBaseModel.extend({
  oauthApiUrl: z.string().url(),
}).transform(record => ({
  id: record.id,
  clientId: record.clientId,
  encryptedClientSecret: record.clientSecret,
  linkedOrganizationId: record.linkedOrganizationId,
  tokenEndpoint: `${record.oauthApiUrl}/token`,
  userinfoEndpoint: `${record.oauthApiUrl}/userinfo`,
  authorizationEndpoint: `${record.oauthApiUrl}/authorize`,
  additionalScopes: record.additionalScopes,
  oidcUserJoinOnly: record.oidcUserJoinOnly,
  oidcUserAccessOnly: record.oidcUserAccessOnly,
  requireInvitation: record.requireInvitation,
  defaultMemberRoleId: record.defaultRoleId,
  defaultResourceAssignment: record.defaultAssignedResources,
}));

const LatestOIDCIntegrationModel = OIDCIntegrationBaseModel.extend({
  oauthApiUrl: z.null(),
  tokenEndpoint: z.string().url(),
  userinfoEndpoint: z.string().url(),
  authorizationEndpoint: z.string().url(),
}).transform(record => ({
  id: record.id,
  clientId: record.clientId,
  encryptedClientSecret: record.clientSecret,
  linkedOrganizationId: record.linkedOrganizationId,
  tokenEndpoint: record.tokenEndpoint,
  userinfoEndpoint: record.userinfoEndpoint,
  authorizationEndpoint: record.authorizationEndpoint,
  additionalScopes: record.additionalScopes,
  oidcUserJoinOnly: record.oidcUserJoinOnly,
  oidcUserAccessOnly: record.oidcUserAccessOnly,
  requireInvitation: record.requireInvitation,
  defaultMemberRoleId: record.defaultRoleId,
  defaultResourceAssignment: record.defaultAssignedResources,
}));

const OIDCIntegrationModel = z.union([OIDCIntegrationLegacyModel, LatestOIDCIntegrationModel]);

const CDNAccessTokenModel = z.object({
  id: z.string(),
  targetId: z.string(),
  s3Key: z.string(),
  firstCharacters: z.string(),
  lastCharacters: z.string(),
  alias: z.string(),
  createdAt: z.string(),
});

const FeatureFlagsModel = z
  .object({
    forceLegacyCompositionInTargets: z.array(z.string()).default([]),
    /** whether app deployments are enabled for the given organization */
    appDeployments: z.boolean().default(false),
    /** whether otel tracing is enabled for the given organization */
    otelTracing: z.boolean().default(false),
    schemaProposals: z.boolean().default(false),
  })
  .optional()
  .nullable()
  .default({})
  .transform(
    val =>
      val ?? {
        forceLegacyCompositionInTargets: [],
        appDeployments: false,
        otelTracing: false,
        schemaProposals: false,
      },
  );

/**  This version introduced the "diffSchemaVersionId" column. */
const SchemaVersionRecordVersion_2024_01_10_Model = z.literal('2024-01-10');

const SchemaVersionRecordVersionModel = SchemaVersionRecordVersion_2024_01_10_Model;

const SchemaMetadataModel = z.object({
  name: z.string(),
  content: z.string(),
  source: z.nullable(z.string()).default(null),
});

const SchemaVersionModel = z.intersection(
  z.object({
    id: z.string(),
    isComposable: z.boolean(),
    createdAt: z.string(),
    baseSchema: z.nullable(z.string()),
    actionId: z.string(),
    hasPersistedSchemaChanges: z.nullable(z.boolean()).transform(val => val ?? false),
    previousSchemaVersionId: z.nullable(z.string()),
    diffSchemaVersionId: z.nullable(z.string()),
    compositeSchemaSDL: z.nullable(z.string()),
    supergraphSDL: z.nullable(z.string()),
    schemaCompositionErrors: z.nullable(z.array(SchemaCompositionErrorModel)),
    recordVersion: z.nullable(SchemaVersionRecordVersionModel),
    tags: z.nullable(z.array(z.string())),
    schemaMetadata: z.nullable(z.record(z.string(), z.array(SchemaMetadataModel))),
    metadataAttributes: z.nullable(z.record(z.string(), z.array(z.string()))),
    hasContractCompositionErrors: z
      .boolean()
      .nullable()
      .transform(val => val ?? false),
    conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
  }),
  z
    .union([
      z.object({
        githubRepository: z.string(),
        githubSha: z.string(),
      }),
      z.object({
        githubRepository: z.null(),
        githubSha: z.null(),
      }),
    ])
    .transform(val => ({
      github: val.githubRepository
        ? {
            repository: val.githubRepository,
            sha: val.githubSha,
          }
        : null,
    })),
);

export type SchemaVersion = z.infer<typeof SchemaVersionModel>;

const DocumentCollectionModel = z.object({
  id: z.string(),
  title: z.string(),
  description: z.union([z.string(), z.null()]),
  targetId: z.string(),
  createdByUserId: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const DocumentCollectionDocumentModel = z.object({
  id: z.string(),
  title: z.string(),
  contents: z.string(),
  variables: z.string().nullable(),
  headers: z.string().nullable(),
  createdByUserId: z.union([z.string(), z.null()]),
  documentCollectionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Insert a schema version changes into the database.
 */
async function insertSchemaVersionContractChanges(
  trx: CommonQueryMethods,
  args: {
    changes: Array<SchemaChangeType> | null;
    schemaVersionContractId: string;
  },
) {
  if (!args.changes?.length) {
    return;
  }

  await trx.query(psql`/* insertSchemaVersionContractChanges */
    INSERT INTO "contract_version_changes" (
      "contract_version_id",
      "change_type",
      "severity_level",
      "meta",
      "is_safe_based_on_usage"
    )
    SELECT * FROM
    ${psql.unnest(
      args.changes.map(change =>
        // Note: change.criticality.level is actually a computed value from meta
        [
          args.schemaVersionContractId,
          change.type,
          change.criticality,
          JSON.stringify(change.meta),
          change.isSafeBasedOnUsage ?? false,
        ],
      ),
      ['uuid', 'text', 'text', 'jsonb', 'bool'],
    )}
  `);
}

/**
 * Insert a schema version changes into the database.
 */
async function insertSchemaVersionChanges(
  trx: CommonQueryMethods,
  args: {
    changes: Array<SchemaChangeType>;
    versionId: string;
  },
) {
  if (args.changes.length === 0) {
    return;
  }

  await trx.query(psql`/* insertSchemaVersionChanges */
    INSERT INTO schema_version_changes (
      "schema_version_id",
      "change_type",
      "severity_level",
      "meta",
      "is_safe_based_on_usage"
    )
    SELECT * FROM
    ${psql.unnest(
      args.changes.map(change =>
        // Note: change.criticality.level is actually a computed value from meta
        [
          args.versionId,
          change.type,
          change.criticality,
          JSON.stringify(change.meta),
          change.isSafeBasedOnUsage ?? false,
        ],
      ),
      ['uuid', 'text', 'text', 'jsonb', 'bool'],
    )}
  `);
}

/**
 * Insert a new schema version into the database.
 */
async function insertSchemaVersion(
  trx: CommonQueryMethods,
  args: {
    isComposable: boolean;
    targetId: string;
    actionId: string;
    baseSchema: string | null;
    previousSchemaVersion: string | null;
    diffSchemaVersionId: string | null;
    compositeSchemaSDL: string | null;
    supergraphSDL: string | null;
    schemaCompositionErrors: Array<SchemaCompositionError> | null;
    tags: Array<string> | null;
    schemaMetadata: Record<
      string,
      Array<{ name: string; content: string; source: string | null }>
    > | null;
    metadataAttributes: Record<string, string[]> | null;
    hasContractCompositionErrors: boolean;
    github: null | {
      sha: string;
      repository: string;
    };
    conditionalBreakingChangeMetadata: null | ConditionalBreakingChangeMetadata;
  },
) {
  const query = psql`/* insertSchemaVersion */
    INSERT INTO schema_versions
      (
        record_version,
        is_composable,
        target_id,
        action_id,
        base_schema,
        has_persisted_schema_changes,
        previous_schema_version_id,
        diff_schema_version_id,
        composite_schema_sdl,
        supergraph_sdl,
        schema_composition_errors,
        github_repository,
        github_sha,
        tags,
        has_contract_composition_errors,
        conditional_breaking_change_metadata,
        schema_metadata,
        metadata_attributes
      )
    VALUES
      (
        '2024-01-10',
        ${args.isComposable},
        ${args.targetId},
        ${args.actionId},
        ${args.baseSchema},
        ${true},
        ${args.previousSchemaVersion},
        ${args.diffSchemaVersionId},
        ${args.compositeSchemaSDL},
        ${args.supergraphSDL},
        ${jsonify(args.schemaCompositionErrors)},
        ${args.github?.repository ?? null},
        ${args.github?.sha ?? null},
        ${Array.isArray(args.tags) ? psql.array(args.tags, 'text') : null},
        ${args.hasContractCompositionErrors},
        ${jsonify(InsertConditionalBreakingChangeMetadataModel.parse(args.conditionalBreakingChangeMetadata))},
        ${jsonify(args.schemaMetadata)},
        ${jsonify(args.metadataAttributes)}
      )
    RETURNING
      ${schemaVersionSQLFields()}
  `;

  return await trx.maybeOne(query).then(SchemaVersionModel.parse);
}

async function insertSchemaVersionContract(
  trx: CommonQueryMethods,
  args: {
    schemaVersionId: string;
    contractId: string;
    contractName: string;
    compositeSchemaSDL: string | null;
    supergraphSDL: string | null;
    schemaCompositionErrors: Array<SchemaCompositionError> | null;
  },
): Promise<string> {
  const id = await trx.oneFirst(psql`/* insertSchemaVersionContract */
    INSERT INTO "contract_versions" (
      "schema_version_id"
      , "contract_id"
      , "contract_name"
      , "schema_composition_errors"
      , "composite_schema_sdl"
      , "supergraph_sdl"
    )
    VALUES (
      ${args.schemaVersionId}
      , ${args.contractId}
      , ${args.contractName}
      , ${jsonify(args.schemaCompositionErrors)}
      , ${args.compositeSchemaSDL}
      , ${args.supergraphSDL}
    )
    RETURNING
      "id"
  `);

  return z.string().parse(id);
}

async function updateSchemaCoordinateStatus(
  trx: CommonQueryMethods,
  args: {
    targetId: string;
    versionId: string;
    coordinatesDiff: SchemaCoordinatesDiffResult;
  },
) {
  const actions: Promise<unknown>[] = [];

  if (args.coordinatesDiff.deleted) {
    // actions.push(
    //   trx.query(sql`/* schema_coordinate_status_deleted */
    //   DELETE FROM schema_coordinate_status
    //   WHERE
    //     target_id = ${args.targetId}
    //     AND
    //     coordinate = ANY(${sql.array(Array.from(args.coordinatesDiff.deleted), 'text')})
    //     AND
    //     created_at <= NOW()
    // `),
    // );
  }

  if (args.coordinatesDiff.added) {
    // actions.push(
    //   trx.query(sql`/* schema_coordinate_status_inserted */
    //     INSERT INTO schema_coordinate_status
    //     ( target_id, coordinate, created_in_version_id, deprecated_at, deprecated_in_version_id )
    //     SELECT * FROM ${sql.unnest(
    //       Array.from(args.coordinatesDiff.added).map(coordinate => {
    //         const isDeprecatedAsWell = args.coordinatesDiff.deprecated.has(coordinate);
    //         return [
    //           args.targetId,
    //           coordinate,
    //           args.versionId,
    //           // if it's added and deprecated at the same time
    //           isDeprecatedAsWell ? 'NOW()' : null,
    //           isDeprecatedAsWell ? args.versionId : null,
    //         ];
    //       }),
    //       ['uuid', 'text', 'uuid', 'date', 'uuid'],
    //     )}
    //   `),
    // );
  }

  if (args.coordinatesDiff.undeprecated) {
    // actions.push(
    //   trx.query(sql`/* schema_coordinate_status_undeprecated */
    //   UPDATE schema_coordinate_status
    //   SET deprecated_at = NULL, deprecated_in_version_id = NULL
    //   WHERE
    //     target_id = ${args.targetId}
    //     AND
    //     coordinate = ANY(${sql.array(Array.from(args.coordinatesDiff.undeprecated), 'text')})
    // `),
    // );
  }

  await Promise.all(actions);

  if (args.coordinatesDiff.deprecated) {
    // await trx.query(sql`/* schema_coordinate_status_deprecated */
    //   UPDATE schema_coordinate_status
    //   SET deprecated_at = NOW(), deprecated_in_version_id = ${args.versionId}
    //   WHERE
    //     target_id = ${args.targetId}
    //     AND
    //     coordinate = ANY(${sql.array(Array.from(args.coordinatesDiff.deprecated), 'text')})
    // `);
  }
}

/**
 * Small helper utility for jsonifying a nullable object.
 */
function jsonify<T>(obj: T | null | undefined) {
  if (obj == null) return null;
  return psql`${JSON.stringify(obj)}::jsonb`;
}

/**
 * Utility function for stripping a schema change of its computable properties for efficient storage in the database.
 */
export function toSerializableSchemaChange(change: SchemaChangeType): {
  id: string;
  type: string;
  meta: Record<string, SerializableValue>;
  approvalMetadata: null | {
    userId: string | null;
    date: string;
    schemaCheckId: string;
    author?: string;
  };
  isSafeBasedOnUsage: boolean;
  usageStatistics: null | {
    topAffectedOperations: Array<{
      name: string;
      hash: string;
      count: number;
    }>;
    topAffectedClients: Array<{
      name: string;
      count: number;
    }>;
  };
  affectedAppDeployments: null | AffectedAppDeployments;
} {
  return {
    id: change.id,
    type: change.type,
    meta: change.meta,
    isSafeBasedOnUsage: change.isSafeBasedOnUsage,
    approvalMetadata: change.approvalMetadata,
    usageStatistics: change.usageStatistics,
    affectedAppDeployments: change.affectedAppDeployments,
  };
}

const schemaCheckSQLFields = psql`
    c."id"
  , to_json(c."created_at") as "createdAt"
  , to_json(c."updated_at") as "updatedAt"
  , coalesce(c."schema_sdl", s_schema."sdl") as "schemaSDL"
  , c."service_name" as "serviceName"
  , c."service_url" as "serviceUrl"
  , c."meta"
  , c."target_id" as "targetId"
  , c."schema_version_id" as "schemaVersionId"
  , c."is_success" as "isSuccess"
  , c."schema_composition_errors" as "schemaCompositionErrors"
  , c."breaking_schema_changes" as "breakingSchemaChanges"
  , c."safe_schema_changes" as "safeSchemaChanges"
  , c."schema_policy_warnings" as "schemaPolicyWarnings"
  , c."schema_policy_errors" as "schemaPolicyErrors"
  , coalesce(c."composite_schema_sdl", s_composite_schema."sdl") as "compositeSchemaSDL"
  , coalesce(c."supergraph_sdl", s_supergraph."sdl") as "supergraphSDL"
  , c."github_check_run_id" as "githubCheckRunId"
  , c."github_repository" as "githubRepository"
  , c."github_sha" as "githubSha"
  , coalesce(c."is_manually_approved", false) as "isManuallyApproved"
  , c."manual_approval_user_id" as "manualApprovalUserId"
  , c."manual_approval_comment" as "manualApprovalComment"
  , c."context_id" as "contextId"
  , c."conditional_breaking_change_metadata" as "conditionalBreakingChangeMetadata"
  , c."schema_proposal_id" as "schemaProposalId"
  , c."schema_proposal_changes" as "schemaProposalChanges"
`;

const schemaVersionSQLFields = (t = psql``) => psql`
  ${t}"id"
  , ${t}"is_composable" as "isComposable"
  , to_json(${t}"created_at") as "createdAt"
  , ${t}"action_id" as "actionId"
  , ${t}"base_schema" as "baseSchema"
  , ${t}"has_persisted_schema_changes" as "hasPersistedSchemaChanges"
  , ${t}"previous_schema_version_id" as "previousSchemaVersionId"
  , ${t}"composite_schema_sdl" as "compositeSchemaSDL"
  , ${t}"supergraph_sdl" as "supergraphSDL"
  , ${t}"schema_composition_errors" as "schemaCompositionErrors"
  , ${t}"github_repository" as "githubRepository"
  , ${t}"github_sha" as "githubSha"
  , ${t}"diff_schema_version_id" as "diffSchemaVersionId"
  , ${t}"record_version" as "recordVersion"
  , ${t}"tags"
  , ${t}"has_contract_composition_errors" as "hasContractCompositionErrors"
  , ${t}"conditional_breaking_change_metadata" as "conditionalBreakingChangeMetadata"
  , ${t}"schema_metadata" as "schemaMetadata"
  , ${t}"metadata_attributes" as "metadataAttributes"
`;

const targetSQLFields = psql`
  "id",
  "clean_id" as "slug",
  "name",
  "project_id" as "projectId",
  "graphql_endpoint_url" as "graphqlEndpointUrl",
  "fail_diff_on_dangerous_change" as "failDiffOnDangerousChange"
`;

export function findTargetById(deps: { pool: PostgresDatabasePool }) {
  return async function findByIdImplementation(id: string): Promise<Target | null> {
    const data = await deps.pool.maybeOne(
      psql`/* getTarget */
        SELECT
          "t".*
          , "p"."org_id" AS "orgId"
        FROM (
          SELECT
            ${targetSQLFields}
          FROM
            "targets"
          WHERE
            "id" = ${id}
        ) AS "t"
        INNER JOIN "projects" "p" ON "t"."projectId" = "p"."id"
      `,
    );

    if (data === null) {
      return null;
    }

    return TargetWithOrgIdModel.parse(data);
  };
}

export function findTargetBySlug(deps: { pool: PostgresDatabasePool }) {
  return async function findTargetsBySlugImplementation(args: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  }): Promise<Target | null> {
    const data = await deps.pool.maybeOne(
      psql`/* getTargetBySlug */
        SELECT
          "t".*
          , "p"."org_id" AS "orgId"
          FROM (
            SELECT
              ${targetSQLFields}
            FROM
              "targets"
            where
              "clean_id" = ${args.targetSlug}
            ) AS "t"
          INNER JOIN "projects" "p" ON "t"."projectId" = "p"."id"
          INNER JOIN "organizations" "o" on "p"."org_id" = "o"."id"
        WHERE "p"."clean_id" = ${args.projectSlug}
         and "o"."clean_id" = ${args.organizationSlug}
      `,
    );

    if (data === null) {
      return null;
    }

    return TargetWithOrgIdModel.parse(data);
  };
}

const TargetModel = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  projectId: z.string(),
  graphqlEndpointUrl: z.string().nullable(),
  failDiffOnDangerousChange: z.boolean(),
});

const TargetWithOrgIdModel = TargetModel.extend({
  orgId: z.string(),
});

export * from './schema-change-model';
export {
  buildRegistryServiceURLFromMeta,
  type RegistryServiceUrlChangeSerializableChange,
} from './schema-change-meta';

export type PaginatedSchemaVersionConnection = Readonly<{
  edges: ReadonlyArray<{
    cursor: string;
    node: SchemaVersion;
  }>;
  pageInfo: Readonly<{
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  }>;
}>;

export type PaginatedOrganizationInvitationConnection = Readonly<{
  edges: ReadonlyArray<{
    cursor: string;
    node: OrganizationInvitation;
  }>;
  pageInfo: Readonly<{
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  }>;
}>;

const getOrganizationInvitationId = (keys: {
  organizationId: string;
  email: string;
  code: string;
}) => Buffer.from([keys.organizationId, keys.email, keys.code].join(':')).toString('hex');
const OrganizationInvitationModel = z
  .object({
    organizationId: z.string(),
    code: z.string(),
    email: z.string().email(),
    createdAt: z.string().transform(v => new Date(v).toISOString()),
    expiresAt: z.string().transform(v => new Date(v).toISOString()),
    roleId: z.string(),
    assignedResources: z.any(),
  })
  .transform(
    invitation =>
      ({
        ...invitation,
        get id(): string {
          return getOrganizationInvitationId(this);
        },
      }) as OrganizationInvitation,
  );

export const userFields = (user: TaggedTemplateLiteralInvocation) => psql`
  ${user}"id"
  , ${user}"email"
  , to_json(${user}"created_at") AS "createdAt"
  , ${user}"display_name" AS "displayName"
  , ${user}"full_name" AS "fullName"
  , ${user}"supertoken_user_id" AS "superTokensUserId"
  , ${user}"is_admin" AS "isAdmin"
  , ${user}"oidc_integration_id" AS "oidcIntegrationId"
  , ${user}"zendesk_user_id" AS "zendeskId"
  , (
      SELECT ARRAY_AGG(DISTINCT "sub_stu"."third_party_id")
      FROM (
        SELECT ${user}"supertoken_user_id"::text "id"
        WHERE ${user}"supertoken_user_id" IS NOT NULL
        UNION
        SELECT "sub_uli"."identity_id"::text "id"
        FROM "users_linked_identities" "sub_uli"
        WHERE "sub_uli"."user_id" = ${user}"id"
      ) "sub_ids"
      LEFT JOIN "supertokens_thirdparty_users" "sub_stu"
      ON "sub_stu"."user_id" = "sub_ids"."id"
    ) AS "providers"
`;

const organizationFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}"id"
  , ${prefix}"clean_id" AS "slug"
  , ${prefix}"name"
  , ${prefix}"limit_retention_days" AS "limitRetentionDays"
  , ${prefix}"limit_operations_monthly" AS "limitOperationsMonthly"
  , ${prefix}"plan_name" AS "billingPlan"
  , ${prefix}"get_started_creating_project" AS "getStartedCreatingProject"
  , ${prefix}"get_started_publishing_schema" AS "getStartedPublishingSchema"
  , ${prefix}"get_started_checking_schema" AS "getStartedCheckingSchema"
  , ${prefix}"get_started_inviting_members" AS "getStartedInvitingMembers"
  , ${prefix}"get_started_reporting_operations" AS "getStartedReportingOperations"
  , ${prefix}"get_started_usage_breaking" AS "getStartedUsageBreaking"
  , ${prefix}"feature_flags" AS "featureFlags"
  , ${prefix}"zendesk_organization_id" AS "zendeskId"
  , ${prefix}"user_id" AS "ownerId"
`;

const projectFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}"id"
  , ${prefix}"clean_id" AS "slug"
  , ${prefix}"name"
  , ${prefix}"org_id" AS "orgId"
  , ${prefix}"type"
  , to_json(${prefix}"created_at") AS "createdAt"
  , ${prefix}"build_url" AS "buildUrl"
  , ${prefix}"validation_url" AS "validationUrl"
  , ${prefix}"git_repository" AS "gitRepository"
  , ${prefix}"github_check_with_project_name" AS "useProjectNameInGithubCheck"
  , ${prefix}"external_composition_enabled" AS "externalCompositionEnabled"
  , ${prefix}"external_composition_endpoint" AS "externalCompositionEndpoint"
  , ${prefix}"external_composition_secret" AS "externalCompositionEncryptedSecret"
  , ${prefix}"native_federation" AS "nativeFederation"
`;

const schemaPolicyFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}"resource_type" AS "resourceType"
  , ${prefix}"resource_id" AS "resourceId"
  , ${prefix}"config"
  , ${prefix}"allow_overriding" AS "allowOverrides"
  , to_json(${prefix}"created_at") AS "createdAt"
  , to_json(${prefix}"updated_at") AS "updatedAt"
`;

const alertChannelFields = (prefix: TaggedTemplateLiteralInvocation = psql``) => psql`
  ${prefix}"id" AS "id",
  ${prefix}"name" AS "name",
  ${prefix}"type" AS "type",
  ${prefix}"project_id" AS "projectId",
  to_json(${prefix}"created_at") AS "createdAt",
  ${prefix}"slack_channel" AS "slackChannel",
  ${prefix}"webhook_endpoint" AS "webhookEndpoint"
`;

const alertFields = (prefix: TaggedTemplateLiteralInvocation = psql``) => psql`
  ${prefix}"id" AS "id",
  ${prefix}"type" AS "type",
  to_json(${prefix}"created_at") AS "createdAt",
  ${prefix}"alert_channel_id" AS "channelId",
  ${prefix}"project_id" AS "projectId",
  ${prefix}"target_id" AS "targetId"
`;

const targetSettingsFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}"validation_enabled" AS "validationEnabled"
  , ${prefix}"validation_percentage" AS "validationPercentage"
  , ${prefix}"validation_period" AS "validationPeriod"
  , ${prefix}"validation_excluded_clients" AS "validationExcludedClients"
  , ${prefix}"validation_excluded_app_deployments" AS "validationExcludedAppDeployments"
  , ${prefix}"validation_request_count" AS "validationRequestCount"
  , ${prefix}"validation_breaking_change_formula" AS "validationBreakingChangeFormula"
  , ${prefix}"fail_diff_on_dangerous_change" AS "failDiffOnDangerousChange"
  , ${prefix}"app_deployment_protection_enabled" AS "appDeploymentProtectionEnabled"
  , ${prefix}"app_deployment_protection_min_days_inactive" AS "appDeploymentProtectionMinDaysInactive"
  , ${prefix}"app_deployment_protection_min_days_since_creation" AS "appDeploymentProtectionMinDaysSinceCreation"
  , ${prefix}"app_deployment_protection_max_traffic_percentage" AS "appDeploymentProtectionMaxTrafficPercentage"
  , ${prefix}"app_deployment_protection_traffic_period_days" AS "appDeploymentProtectionTrafficPeriodDays"
  , ${prefix}"app_deployment_protection_rule_logic" AS "appDeploymentProtectionRuleLogic"
`;

const schemaLogFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}"id"
  , ${prefix}"author"
  , ${prefix}"commit"
  , ${prefix}"sdl"
  , ${prefix}"created_at" AS "date"
  , ${prefix}"target_id" AS "target"
  , ${prefix}"metadata"
  , lower(${prefix}"service_name") AS "service_name"
  , ${prefix}"service_url"
  , ${prefix}"action"
`;

const cdnAccessTokenFields = (prefix: TaggedTemplateLiteralInvocation = psql``) => psql`
  ${prefix}"id" AS "id"
  , ${prefix}"target_id" AS "targetId"
  , ${prefix}"s3_key" AS "s3Key"
  , ${prefix}"first_characters" AS "firstCharacters"
  , ${prefix}"last_characters" AS "lastCharacters"
  , ${prefix}"alias" AS "alias"
  , to_json(${prefix}"created_at") as "createdAt"
`;

const oidcIntegrationFields = (prefix: TaggedTemplateLiteralInvocation = psql``) => psql`
  ${prefix}"id" AS "id"
  , ${prefix}"linked_organization_id" AS "linkedOrganizationId"
  , ${prefix}"client_id" AS "clientId"
  , ${prefix}"client_secret" AS "clientSecret"
  , ${prefix}"oauth_api_url" AS "oauthApiUrl"
  , ${prefix}"token_endpoint" AS "tokenEndpoint"
  , ${prefix}"userinfo_endpoint" AS "userinfoEndpoint"
  , ${prefix}"authorization_endpoint" AS "authorizationEndpoint"
  , ${prefix}"additional_scopes" AS "additionalScopes"
  , ${prefix}"oidc_user_join_only" AS "oidcUserJoinOnly"
  , ${prefix}"oidc_user_access_only" AS "oidcUserAccessOnly"
  , ${prefix}"default_role_id" AS "defaultRoleId"
  , ${prefix}"default_assigned_resources" AS "defaultAssignedResources"
  , ${prefix}"require_invitation" AS "requireInvitation"
`;

const SchemaLogBase = z.object({
  id: z.string(),
  date: z.number(),
  target: z.string().uuid(),
});

const SchemaPushLogBase = SchemaLogBase.extend({
  author: z.string(),
  commit: z.string(),
  sdl: z.string(),
  metadata: z.string().nullish().default(null),
});

const SinglePushSchemaLogModel = SchemaPushLogBase.extend({
  action: z.literal('PUSH'),
  type: z.literal('SINGLE'),
  service_name: z.string().nullable(),
  service_url: z.string().nullable(),
}).transform(value => ({
  ...value,
  kind: 'single' as const,
}));

export type SinglePushSchemaLog = z.TypeOf<typeof SinglePushSchemaLogModel>;

const CompositeSchemaTypeModel = z.union([z.literal('FEDERATION'), z.literal('STITCHING')]);

const CompositePushSchemaLogModel = SchemaPushLogBase.extend({
  action: z.literal('PUSH'),
  type: CompositeSchemaTypeModel,
  service_name: z.string(),
  service_url: z.string(),
}).transform(value => ({
  ...value,
  kind: 'composite' as const,
}));

export type CompositePushSchemaLog = z.TypeOf<typeof CompositePushSchemaLogModel>;

const CompositeDeletedSchemaLogModel = SchemaLogBase.extend({
  action: z.literal('DELETE'),
  service_name: z.string(),
}).transform(value => ({
  ...value,
  kind: 'composite' as const,
}));

export type CompositeDeletedSchemaLog = z.TypeOf<typeof CompositeDeletedSchemaLogModel>;

const SchemaPushLogModel = z.union([SinglePushSchemaLogModel, CompositePushSchemaLogModel]);
const SchemaLogModel = z.union([SchemaPushLogModel, CompositeDeletedSchemaLogModel]);

const OrganizationModel = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    limitRetentionDays: z.number(),
    limitOperationsMonthly: z.number(),
    billingPlan: z.string(),
    getStartedCreatingProject: z.boolean(),
    getStartedPublishingSchema: z.boolean(),
    getStartedCheckingSchema: z.boolean(),
    getStartedInvitingMembers: z.boolean(),
    getStartedReportingOperations: z.boolean(),
    getStartedUsageBreaking: z.boolean(),
    featureFlags: FeatureFlagsModel,
    zendeskId: z.string().nullable(),
    ownerId: z.string(),
  })
  .transform(org => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    billingPlan: org.billingPlan,
    monthlyRateLimit: {
      retentionInDays: org.limitRetentionDays,
      operations: org.limitOperationsMonthly,
    },
    getStarted: {
      id: org.id,
      creatingProject: org.getStartedCreatingProject,
      publishingSchema: org.getStartedPublishingSchema,
      checkingSchema: org.getStartedCheckingSchema,
      invitingMembers: org.getStartedInvitingMembers,
      reportingOperations: org.getStartedReportingOperations,
      enablingUsageBasedBreakingChanges: org.getStartedUsageBreaking,
    },
    featureFlags: org.featureFlags,
    zendeskId: org.zendeskId,
    ownerId: org.ownerId,
  }));

const ProjectModel = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    orgId: z.string(),
    type: z.string(),
    createdAt: z.string(),
    buildUrl: z.string().nullable(),
    validationUrl: z.string().nullable(),
    gitRepository: z.string().nullable(),
    useProjectNameInGithubCheck: z.boolean(),
    externalCompositionEnabled: z.boolean(),
    externalCompositionEndpoint: z.string().nullable(),
    externalCompositionEncryptedSecret: z.string().nullable(),
    nativeFederation: z.boolean().nullable(),
  })
  .transform(project => ({
    id: project.id,
    slug: project.slug,
    orgId: project.orgId,
    name: project.name,
    type: project.type as ProjectType,
    createdAt: project.createdAt,
    buildUrl: project.buildUrl,
    validationUrl: project.validationUrl,
    gitRepository: project.gitRepository as `${string}/${string}` | null,
    useProjectNameInGithubCheck: project.useProjectNameInGithubCheck === true,
    externalComposition: {
      enabled: project.externalCompositionEnabled,
      endpoint: project.externalCompositionEndpoint,
      encryptedSecret: project.externalCompositionEncryptedSecret,
    },
    nativeFederation: project.nativeFederation === true,
  }));

const OrganizationBillingModel = z.object({
  organizationId: z.string(),
  externalBillingReference: z.string(),
  billingEmailAddress: z.string().nullable(),
});

const AlertChannelModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['MSTEAMS_WEBHOOK', 'SLACK', 'WEBHOOK']),
  projectId: z.string(),
  createdAt: z.string(),
  slackChannel: z.string().nullable(),
  webhookEndpoint: z.string().nullable(),
});

const AlertModel = z.object({
  id: z.string(),
  type: z.enum(['SCHEMA_CHANGE_NOTIFICATIONS']),
  createdAt: z.string(),
  channelId: z.string(),
  projectId: z.string(),
  targetId: z.string(),
});

const OrganizationUserIdAndIdModel = z.object({
  id: z.string(),
  user_id: z.string(),
});

const SchemaPolicyModel = z
  .object({
    resourceType: z.enum(['ORGANIZATION', 'PROJECT']),
    resourceId: z.string(),
    config: z.any(),
    allowOverrides: z.boolean(),
    createdAt: z.string().transform(t => new Date(t)),
    updatedAt: z.string().transform(t => new Date(t)),
  })
  .transform(sp => ({
    id: `${sp.resourceType}_${sp.resourceId}`,
    config: sp.config,
    createdAt: sp.createdAt,
    updatedAt: sp.updatedAt,
    resource: sp.resourceType,
    resourceId: sp.resourceId,
    allowOverrides: sp.allowOverrides,
  }));

const MemberModel = z
  .object({
    id: z.string(),
    isOwner: z.boolean(),
    scopes: z.array(z.string()).nullable(),
    organizationId: z.string(),
    oidcIntegrationId: z.string().nullable(),
    connectedToZendesk: z.boolean().nullable(),
    roleId: z.string(),
    roleName: z.string(),
    roleLocked: z.boolean(),
    roleDescription: z.string(),
    roleScopes: z.array(z.string()).nullable(),
    // user fields are also present in the row
    email: z.string(),
    createdAt: z.string(),
    displayName: z.string(),
    fullName: z.string(),
    superTokensUserId: z.string().nullable(),
    isAdmin: z
      .boolean()
      .nullable()
      .transform(value => value ?? false),
    zendeskId: z.string().nullable(),
    providers: z.array(
      z
        .string()
        .nullable()
        .transform(provider => {
          if (provider === 'oidc') {
            return 'OIDC' as const;
          }
          if (provider === 'github') {
            return 'GITHUB' as const;
          }
          if (provider === 'google') {
            return 'GOOGLE' as const;
          }
          return null;
        }),
    ),
  })
  .transform(row => ({
    id: row.id,
    isOwner: row.isOwner,
    user: {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      displayName: row.displayName,
      providers: row.providers.filter((p): p is NonNullable<typeof p> => p != null),
      superTokensUserId: row.superTokensUserId,
      isAdmin: row.isAdmin,
      zendeskId: row.zendeskId,
    },
    scopes: (row.scopes as Member['scopes']) || [],
    organization: row.organizationId,
    oidcIntegrationId: row.oidcIntegrationId ?? null,
    connectedToZendesk: row.connectedToZendesk ?? false,
    role: {
      id: row.roleId,
      name: row.roleName,
      locked: row.roleLocked,
      description: row.roleDescription,
      scopes: (row.roleScopes as Member['scopes']) ?? [],
      organizationId: row.organizationId,
      membersCount: undefined as number | undefined,
    },
  }));

const OrganizationMemberAccessModel = z.object({
  organization_id: z.string(),
  user_id: z.string(),
  scopes: z.array(z.string()).nullable(),
});

const TargetSettingsModel = z
  .object({
    validationEnabled: z.boolean(),
    validationPercentage: z.number(),
    validationPeriod: z.number(),
    validationExcludedClients: z.array(z.string()).nullable(),
    validationExcludedAppDeployments: z.array(z.string()).nullable(),
    validationRequestCount: z.number().nullable(),
    validationBreakingChangeFormula: z.string().nullable(),
    failDiffOnDangerousChange: z.boolean(),
    targets: z.array(z.string()).nullable(),
    appDeploymentProtectionEnabled: z.boolean(),
    appDeploymentProtectionMinDaysInactive: z.number(),
    appDeploymentProtectionMinDaysSinceCreation: z.number(),
    appDeploymentProtectionMaxTrafficPercentage: z.coerce.number(),
    appDeploymentProtectionTrafficPeriodDays: z.number(),
    appDeploymentProtectionRuleLogic: z.enum(['AND', 'OR']),
  })
  .transform(row => ({
    failDiffOnDangerousChange: row.failDiffOnDangerousChange,
    validation: {
      isEnabled: row.validationEnabled,
      percentage: row.validationPercentage,
      period: row.validationPeriod,
      requestCount: row.validationRequestCount ?? 1,
      breakingChangeFormula: (row.validationBreakingChangeFormula ?? 'PERCENTAGE') as
        | 'PERCENTAGE'
        | 'REQUEST_COUNT',
      targets: Array.isArray(row.targets) ? row.targets : [],
      excludedClients: Array.isArray(row.validationExcludedClients)
        ? row.validationExcludedClients
        : [],
      excludedAppDeployments: Array.isArray(row.validationExcludedAppDeployments)
        ? row.validationExcludedAppDeployments
        : [],
    },
    appDeploymentProtection: {
      isEnabled: row.appDeploymentProtectionEnabled,
      minDaysInactive: row.appDeploymentProtectionMinDaysInactive,
      minDaysSinceCreation: row.appDeploymentProtectionMinDaysSinceCreation,
      maxTrafficPercentage: row.appDeploymentProtectionMaxTrafficPercentage,
      trafficPeriodDays: row.appDeploymentProtectionTrafficPeriodDays,
      ruleLogic: row.appDeploymentProtectionRuleLogic,
    },
  }));

const TargetIdModel = z.object({
  id: z.string(),
});

const OrganizationTargetPairModel = z.object({
  organization: z.string(),
  target: z.string(),
});

const OrganizationStatModel = z.object({
  id: z.string(),
  total: z.number(),
});

export const UserModel = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  displayName: z.string(),
  fullName: z.string(),
  superTokensUserId: z.string().nullable(),
  isAdmin: z
    .boolean()
    .nullable()
    .transform(value => value ?? false),
  oidcIntegrationId: z.string().nullable(),
  zendeskId: z.string().nullable(),
  providers: z.array(
    z
      .string()
      .nullable()
      .transform(provider => {
        if (provider === 'oidc') {
          return 'OIDC' as const;
        }
        if (provider === 'google') {
          return 'GOOGLE' as const;
        }
        if (provider === 'github') {
          return 'GITHUB' as const;
        }
        return 'USERNAME_PASSWORD' as const;
      }),
  ),
});

type UserType = z.TypeOf<typeof UserModel>;
