import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS
        "ip_address" String CODEC(ZSTD(1))
      , ADD COLUMN IF NOT EXISTS
        "user_agent" String CODEC(ZSTD(1))
    ;
  `);
};
