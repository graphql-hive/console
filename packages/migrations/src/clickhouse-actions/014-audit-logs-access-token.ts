import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS
        "access_token_id" String CODEC(ZSTD(1))
    ;
  `);
};
