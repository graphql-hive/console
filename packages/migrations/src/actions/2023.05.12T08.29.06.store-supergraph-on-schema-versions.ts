import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2023.05.12T08.29.06.store-supergraph-on-schema-versions.sql',
  run: ({ psql }) => psql`
ALTER TABLE "schema_versions"
  ADD COLUMN "supergraph_sdl" text
;
`,
} satisfies MigrationExecutor;
