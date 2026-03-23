import { z } from 'zod';
import { type MigrationExecutor } from '../pg-migrator';

const QUERY_RESULT = z.array(
  z.object({
    organizationId: z.string(),
    sortedScopes: z.array(z.string()),
    userIds: z.array(z.string()),
  }),
);

/**
 * This migration is going to create a new role for each group of members
 * that have the same scopes but no role assigned.
 *
 * The role will be named "Auto Role {counter}".
 * The counter will be reset for each organization.
 *
 * Completes:
 * https://the-guild.dev/graphql/hive/product-updates/2023-12-05-member-roles
 *
 * Users won't be affected by this change, as they will still have the same scopes.
 */
export default {
  name: '2025.01.09T00-00-00.legacy-member-scopes.ts',
  noTransaction: true,
  async run({ psql, connection }) {
    const queryResult = await connection.any(psql`
      SELECT
        organization_id as "organizationId",
        sorted_scopes as "sortedScopes",
        ARRAY_AGG(user_id) AS "userIds"
      FROM (
          SELECT
              organization_id,
              user_id,
              ARRAY_AGG(scope ORDER BY scope) AS sorted_scopes
          FROM (
              SELECT
                  organization_id,
                  user_id,
                  UNNEST(scopes) AS scope
              FROM organization_member
              WHERE role_id IS NULL
          ) unnested
          GROUP BY organization_id, user_id
      ) sorted_scopes_per_user
      GROUP BY organization_id, sorted_scopes
      ORDER BY organization_id;
    `);

    if (queryResult.length === 0) {
      console.log('No members without role_id found.');
      return;
    }

    // rows are sorted by organization_id
    // and grouped by scopes
    // so we can process them in order
    const rows = QUERY_RESULT.parse(queryResult);

    let counter = 1;
    let previousOrganizationId: string | null = null;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (previousOrganizationId !== row.organizationId) {
        previousOrganizationId = row.organizationId;
        // reset counter as we are starting a new organization
        counter = 1;
      }

      console.log(
        `processing organization_id="${row.organizationId}" (${counter}) with ${row.userIds.length} users | ${index + 1}/${queryResult.length}`,
      );

      const startedAt = Date.now();

      await connection.query(psql`
        WITH new_role AS (
          INSERT INTO organization_member_roles (
            organization_id, name, description, scopes
          )
          VALUES (
            ${row.organizationId},
            'Auto Role ' || substring(uuid_generate_v4()::text FROM 1 FOR 8),
            'Auto generated role to assign to members without a role',
            ${psql.array(row.sortedScopes, 'text')}
          )
          RETURNING id
        )
        UPDATE organization_member
        SET role_id = (SELECT id FROM new_role)
        WHERE organization_id = ${row.organizationId} AND user_id = ANY(${psql.array(row.userIds, 'uuid')})
      `);

      console.log(`finished after ${Date.now() - startedAt}ms`);

      counter++;
    }
  },
} satisfies MigrationExecutor;
