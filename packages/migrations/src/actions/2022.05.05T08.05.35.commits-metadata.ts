import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2022.05.05T08.05.35.commits-metadata.sql',
  run: ({ psql }) => psql`
ALTER TABLE
  commits
ADD COLUMN
  "metadata" TEXT;
`,
} satisfies MigrationExecutor;
