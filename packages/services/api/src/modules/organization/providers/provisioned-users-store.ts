import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import {
  CommonQueryMethods,
  PostgresDatabasePool,
  psql,
  UniqueIntegrityConstraintViolationError,
} from '@hive/postgres';

@Injectable({ scope: Scope.Operation })
export class ProvisionedUsersStore {
  constructor(private pool: PostgresDatabasePool) {}

  async findUserProvisionedByOrganizationIdAndExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<ProvisionedUser | null> {
    const query = psql`
      SELECT
        ${userFields}
      FROM
        "users"
      WHERE
        "provisioned_by_organization_id" = ${organizationId}
        AND "external_id" = ${externalId}
    `;

    return await this.pool.maybeOne(query).then(ProvisionedUserModel.nullable().parse);
  }

  findUserProvisionedByOrganizationIdAndId(organizationId: string, userId: string) {
    return ProvisionedUsersStore.findUserProvisionedByOrganizationIdAndId(
      this.pool,
      organizationId,
      userId,
    );
  }

  static async findUserProvisionedByOrganizationIdAndId(
    pool: CommonQueryMethods,
    organizationId: string,
    userId: string,
  ): Promise<ProvisionedUser | null> {
    const query = psql`
      SELECT
        ${userFields}
      FROM
        "users"
      WHERE
        "id" = ${userId}
        AND "provisioned_by_organization_id" = ${organizationId}

    `;

    return await pool.maybeOne(query).then(ProvisionedUserModel.nullable().parse);
  }

  async findUserProvisionedByOrganizationIdAndDisplayName(
    organizationId: string,
    displayName: string,
  ) {
    const query = psql`
      SELECT
        ${userFields}
      FROM
        "users"
      WHERE
        "provisioned_by_organization_id" = ${organizationId}
        AND lower("display_name") = lower(${displayName})
    `;

    return await this.pool.maybeOne(query).then(ProvisionedUserModel.nullable().parse);
  }

  async createUser(
    args: {
      email: string;
      displayName: string;
      fullName: string;
      superTokensUserId: string;
      oidcIntegrationId: string;
      provisionedByOrganizationId: string;
      externalId: string;
      isDisabled: boolean;
    },
    trx: CommonQueryMethods = this.pool,
  ): Promise<
    | { type: 'success'; user: ProvisionedUser; errorCode?: never }
    | { type: 'error'; errorCode: 'displayNameConflict'; user?: never }
  > {
    return trx
      .transaction('createUser', async trx => {
        const query = psql` /* Create Hive User */
          INSERT INTO "users" (
            "email"
            , "display_name"
            , "full_name"
            , "supertoken_user_id"
            , "oidc_integration_id"
            , "provisioned_by_organization_id"
            , "external_id"
            , "deactivated_at"
            , "provisioning_status"
          ) VALUES (
            lower(${args.email})
            , ${args.displayName}
            , ${args.fullName}
            , ${args.superTokensUserId}
            , ${args.oidcIntegrationId}
            , ${args.provisionedByOrganizationId}
            , ${args.externalId}
            , ${args.isDisabled ? psql`NOW()` : null}
            , 'active'
          )
          ON CONFLICT ("supertoken_user_id")
            DO UPDATE
              SET
                "email" = lower(EXCLUDED."email")
                , "display_name" = EXCLUDED."display_name"
                , "full_name" = EXCLUDED."full_name"
                , "oidc_integration_id" = EXCLUDED."oidc_integration_id"
                , "provisioned_by_organization_id" = EXCLUDED."provisioned_by_organization_id"
                , "external_id" = EXCLUDED."external_id"
                , "deactivated_at" = EXCLUDED."deactivated_at"
                , "provisioning_status" = 'pendingAdoption'
          RETURNING
            ${userFields}
        `;

        const user = await trx.one(query).then(ProvisionedUserModel.parse);

        await trx.query(psql` /* Link User Identity */
          INSERT INTO "users_linked_identities" (
            "user_id"
            , "identity_id"
          )
          VALUES (
            ${user.id}
            , ${args.superTokensUserId}
          )
          ON CONFLICT
            DO NOTHING
        `);

        await trx.query(psql` /* Add member to org */
          INSERT INTO "organization_member" (
            "organization_id"
            , "user_id"
            , "role_id"
            , "assigned_resources"
            , "created_at"
          )
          VALUES (
            ${args.provisionedByOrganizationId}
            , ${user.id}
            , (
              SELECT "id"
              FROM "organization_member_roles"
              WHERE
                "organization_id" = ${args.provisionedByOrganizationId}
                AND name = 'Viewer'
            )
            , ${
              /** adding the minimal thing so user cannot access anything */
              psql.jsonb({ mode: '*', projects: [] })
            }
            , NOW()
          )
          ON CONFLICT
            DO NOTHING
        `);

        return user;
      })
      .then(user => ({
        type: 'success' as const,
        user,
      }))
      .catch(err => {
        if (err instanceof UniqueIntegrityConstraintViolationError) {
          if (err.constraint === 'idx_users_provisioned_by_organization_id_display_name') {
            return {
              type: 'error' as const,
              errorCode: 'displayNameConflict' as const,
            };
          }
        }
        throw err;
      });
  }

  async disableUser(userId: string, trx: CommonQueryMethods) {
    const updateUserQuery = psql`
      UPDATE "users"
      SET "deactivated_at" = NOW()
      WHERE "id" = ${userId}
      RETURNING
        ${userFields}
    `;

    const deleteGroupMembershipsQuery = psql`
      DELETE
      FROM "group_members"
      WHERE "user_id" = ${userId}
    `;

    return await trx.transaction('disableUser', async trx => {
      await trx.query(deleteGroupMembershipsQuery);
      return await trx.maybeOne(updateUserQuery).then(ProvisionedUserModel.parse);
    });
  }

  async enableUser(userId: string, trx: CommonQueryMethods) {
    const query = psql`
      UPDATE "users"
      SET "deactivated_at" = NULL
      WHERE "id" = ${userId}
      RETURNING
        ${userFields}
    `;

    return await trx.maybeOne(query).then(ProvisionedUserModel.parse);
  }

  async confirmPendingAccountTakeover(organizationId: string, userId: string) {
    const query = psql`
      UPDATE "users"
      SET "provisioning_status" = 'active'
      WHERE
        "id" = ${userId}
        AND "provisioned_by_organization_id" = ${organizationId}
        AND "provisioning_status" = 'pendingAdoption'
      RETURNING
        ${userFields}
    `;

    return await this.pool.maybeOne(query).then(ProvisionedUserModel.nullable().parse);
  }

  async updateUserEmail(
    organizationId: string,
    userId: string,
    email: string,
    trx: CommonQueryMethods,
  ) {
    const query = psql`
      UPDATE "users"
      SET
        "email" = lower(${email})
      WHERE
        "provisioned_by_organization_id" = ${organizationId}
        AND "id" = ${userId}
      RETURNING
        ${userFields}
    `;

    return await trx.maybeOne(query).then(ProvisionedUserModel.parse);
  }

  async updateUserDisplayNameByOrganizationIdAndUserId(
    organizationId: string,
    userId: string,
    displayName: string,
    trx: CommonQueryMethods,
  ) {
    const query = psql`
      UPDATE
        "users"
      SET
        "display_name" = ${displayName}
      WHERE
        "id" = ${userId}
        AND "provisioned_by_organization_id" = ${organizationId}
      RETURNING
        ${userFields}
    `;

    return await trx
      .maybeOne(query)
      .then(ProvisionedUserModel.nullable().parse)
      .then(user =>
        user
          ? { type: 'success' as const, user }
          : { type: 'error' as const, errorCode: 'notFound' as const },
      )
      .catch(err => {
        if (err instanceof UniqueIntegrityConstraintViolationError) {
          if (err.constraint === 'idx_users_provisioned_by_organization_id_display_name') {
            return {
              type: 'error' as const,
              errorCode: 'displayNameConflict' as const,
            };
          }
        }
        throw err;
      });
  }

  async updateExternalIdByOrganizationIdAndUserId(
    organizationId: string,
    userId: string,
    newExternalId: string,
    trx: CommonQueryMethods,
  ) {
    const query = psql`
      UPDATE
        "users"
      SET
        "external_id" = ${newExternalId}
      WHERE
        "id" = ${userId}
        AND "provisioned_by_organization_id" = ${organizationId}
      RETURNING
        ${userFields}
    `;

    return await trx
      .maybeOne(query)
      .then(ProvisionedUserModel.nullable().parse)
      .then(user =>
        user
          ? { type: 'success' as const, user }
          : { type: 'error' as const, errorCode: 'notFound' as const },
      )
      .catch(err => {
        if (err instanceof UniqueIntegrityConstraintViolationError) {
          if (err.constraint === 'idx_users_provisioned_by_organization_id_external_id') {
            return {
              type: 'error' as const,
              errorCode: 'conflictOnExternalId' as const,
            };
          }
        }
        throw err;
      });
  }

  async getOffsetPaginatedUsersForOrganizationId(
    organizationId: string,
    args: {
      offset: number;
      count: number;
    },
  ) {
    const query = psql`
      SELECT
        ${userFields}
      FROM
        "users"
      WHERE
        "provisioned_by_organization_id" = ${organizationId}
      ORDER BY
        "id"
      LIMIT ${args.count}
      OFFSET ${args.offset}
    `;

    return await this.pool.any(query).then(z.array(ProvisionedUserModel).parse);
  }

  async getTotalProvisionedUserCountForOrganizationId(organizationId: string) {
    const query = psql` /* getTotalProvisionedUserCountForOrganizationId */
      SELECT
        COUNT(*)
      FROM
        "users"
      WHERE
        "provisioned_by_organization_id" = ${organizationId}
    `;

    return await this.pool.oneFirst(query).then(z.number().parse);
  }

  /** Find out whether any supertoken identity linked to the identity is allowed to access the organization. */
  async isIdentityAdminOfOrganization(superTokensUserId: string, organizationId: string) {
    const query = psql`
      SELECT TRUE as "exists"
      FROM "organizations" "o"
      WHERE
        "o"."id" = ${organizationId}
        AND EXISTS (
          SELECT 1
          FROM "users" "u"
          WHERE
            "u"."id" = "o"."user_id"
            AND (
              "u"."supertoken_user_id" = ${superTokensUserId}
              OR EXISTS (
                SELECT 1
                FROM "users_linked_identities" "uli"
                WHERE
                  "uli"."user_id" = "u"."id"
                  AND "uli"."identity_id" = ${superTokensUserId}
              )
            )
          )
      LIMIT 1
    `;

    return this.pool
      .maybeOneFirst(query)
      .then(z.literal(true).nullable().parse)
      .then(value => value ?? false);
  }
}

const ProvisionedUserModel = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  fullName: z.string(),
  provisionedByOrganizationId: z.string().uuid(),
  externalId: z.string(),
  deactivatedAt: z.string().nullable(),
  provisioningStatus: z.enum(['pendingAdoption', 'active']),
  supertokenUserId: z.string(),
  createdAt: z.string(),
  lastUpdatedAt: z.string().nullable(),
});

export type ProvisionedUser = z.TypeOf<typeof ProvisionedUserModel>;

const userFields = psql`
  "id"
  , "email"
  , "full_name" AS "fullName"
  , "display_name" AS "displayName"
  , "provisioned_by_organization_id" AS "provisionedByOrganizationId"
  , "external_id" AS "externalId"
  , to_json("deactivated_at") AS "deactivatedAt"
  , "provisioning_status" AS "provisioningStatus"
  , "supertoken_user_id" AS "supertokenUserId"
  , to_json("created_at") AS "createdAt"
  , to_json("last_updated_at") AS "lastUpdatedAt"
`;
