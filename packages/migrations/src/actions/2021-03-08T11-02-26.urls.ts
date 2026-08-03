import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2021-03-08T11-02-26.urls.sql',
  run: ({ psql }) => psql`
--urls (up)
ALTER TABLE
  projects
ALTER COLUMN
  build_url
TYPE
  TEXT,
ALTER COLUMN
  validation_url
TYPE
  TEXT;
`,
} satisfies MigrationExecutor;
