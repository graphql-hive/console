import { z } from 'zod';
import { type MigrationExecutor } from '../pg-migrator';

const QUERY_RESULT = z.array(z.object({
  organization_id: z.string(),
  sorted_scopes: z.array(z.string()),
  user_ids: z.array(z.string()),
}));

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
  async run({ sql, connection }) {
    const queryResult = await connection.query(sql`
      SELECT
        organization_id,
        sorted_scopes,
        ARRAY_AGG(user_id) AS user_ids
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
          ) unnested
          GROUP BY organization_id, user_id
      ) sorted_scopes_per_user
      GROUP BY organization_id, sorted_scopes
      ORDER BY organization_id;
    `);
  
    if (queryResult.rowCount === 0) {
      console.log('No members without role_id found.');
      return;
    }

    // rows are sorted by organization_id
    // and grouped by scopes
    // so we can process them in order
    const rows = QUERY_RESULT.parse(queryResult.rows);

    let counter = 1;
    let previousOrganizationId: string | null = null;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (previousOrganizationId !== row.organization_id) {
        previousOrganizationId = row.organization_id;
        // reset counter as we are starting a new organization
        counter = 1;
      }

      console.log(
        `processing organization_id="${row.organization_id}" (${counter}) with ${row.user_ids.length} users | ${index}/${queryResult.rowCount}`,
      );

      const startedAt = Date.now();

      await connection.query(sql`
        WITH new_role AS (
          INSERT INTO organization_member_roles (
            organization_id, name, description, scopes
          )
          VALUES (
            ${row.organization_id},
            ${`Auto Role ${counter}`},
            'Auto generated role to assign to members without a role',
            ${row.sorted_scopes}
          )
          RETURNING id
        )
        UPDATE organization_member
        SET role_id = (SELECT id FROM new_role)
        WHERE organization_id = ${row.organization_id} AND user_id = ANY(${row.user_ids})
      `);

      console.log(`finished after ${Date.now() - startedAt}ms`);

      counter++;
    }
  },
} satisfies MigrationExecutor;
