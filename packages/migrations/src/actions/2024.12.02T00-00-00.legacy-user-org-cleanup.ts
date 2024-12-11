import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2024.12.02T00-00-00.legacy-user-org-cleanup.ts',
  async run({ sql, connection }) {
    // Delete all the organizations owned by a legacy user
    await connection.query(sql`
      DELETE
      FROM
        "organizations"
      WHERE
        "user_id" = ANY(
          SELECT
            "id"
          FROM
            "users"
          WHERE
            "supertoken_user_id" IS NULL
        )
    `);

    // Delete all the legacy users
    await connection.query(sql`
      DELETE
      FROM
        "users"
      WHERE
        "supertoken_user_id" IS NULL
    `);
  },
} satisfies MigrationExecutor;
