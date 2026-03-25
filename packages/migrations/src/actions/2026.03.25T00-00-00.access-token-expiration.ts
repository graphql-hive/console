import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.03.25T00-00-00.access-token-expiration.ts',
  /**
   * Adds an expiration date to tokens. This expiration doesn't need to
   * be an index since we're always looking up by ID and then can verify
   * the timestamp via a filter. Since these lookups are always be done
   * via provider methods and not via a raw table query, this is safe.
   */
  run: ({ sql }) => sql`
    ALTER TABLE IF EXISTS organization_access_tokens
    ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE
    ;
  `,
} satisfies MigrationExecutor;
