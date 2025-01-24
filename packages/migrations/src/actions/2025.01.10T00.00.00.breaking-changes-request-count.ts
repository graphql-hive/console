import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2025.01.10T00.00.00.breaking-changes-request-count.ts',
  run: ({ sql }) => sql`
CREATE TYPE
  breaking_change_formula AS ENUM('PERCENTAGE', 'REQUEST_COUNT');

ALTER TABLE
  targets
ADD COLUMN
  validation_request_count INT NOT NULL DEFAULT 1;

ALTER TABLE
  targets
ADD COLUMN
  validation_breaking_change_formula breaking_change_formula NOT NULL DEFAULT 'PERCENTAGE';
`,
} satisfies MigrationExecutor;
