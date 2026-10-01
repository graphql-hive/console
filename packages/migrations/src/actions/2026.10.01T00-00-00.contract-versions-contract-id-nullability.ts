import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.10.01T00-00-00.contract-versions-contract-id-nullability.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "contract_versions"
      ALTER COLUMN "contract_id" DROP NOT NULL
    ;
  `,
} satisfies MigrationExecutor;
