import { type MigrationExecutor } from '../pg-migrator';

/**
 * Fix issue where a target cannot be deleted because it has contracts:
 *
 * """
 * Query violates a foreign key integrity constraint. update or delete on table "targets"
 * violates foreign key constraint "contracts_target_id_fkey" on table "contracts"
 * """"
 */
export default {
  name: '2025.05.15T00-00-00.contracts-foreign-key-constraint-fix.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'drop constraint contracts_target_id_fkey',
      query: sql`
        ALTER TABLE "contracts"
          DROP CONSTRAINT IF EXISTS "contracts_target_id_fkey"
          , ADD CONSTRAINT "contracts_target_id_fkey"
            FOREIGN KEY ("target_id")
            REFERENCES "targets"("id")
            ON DELETE CASCADE
      `,
    },
  ],
} satisfies MigrationExecutor;
