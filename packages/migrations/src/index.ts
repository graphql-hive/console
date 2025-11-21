#!/usr/bin/env node
import { createPool } from 'slonik';
import { schemaCoordinateStatusMigration } from './actions/2024.07.23T09.36.00.schema-cleanup-tracker';
import { migrateClickHouse } from './clickhouse';
import { createConnectionString } from './connection-string';
import { env } from './environment';
import { runPGMigrations } from './run-pg-migrations';
import { updateRetention } from './scripts/update-retention';

const slonik = await createPool(createConnectionString(env.postgres), {
  // 10 minute timeout per statement
  statementTimeout: 10 * 60 * 1000,
});

// This is used by production build of this package.
// We are building a "cli" out of the package, so we need a workaround to pass the command to run.

// This is only used for GraphQL Hive Cloud to perform a long running migration.
// eslint-disable-next-line no-process-env
if (process.env.SCHEMA_COORDINATE_STATUS_MIGRATION === '1') {
  try {
    console.log('Running the SCHEMA_COORDINATE_STATUS_MIGRATION');
    await schemaCoordinateStatusMigration(slonik);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

try {
  console.log('Running the UP migrations');
  await runPGMigrations({ slonik });
  if (env.clickhouse) {
    await migrateClickHouse(
      env.isClickHouseMigrator,
      env.isHiveCloud,
      env.hiveCloudEnvironment,
      env.clickhouse,
    );
  }

  // Automatically apply retention if any retention setting is configured
  // eslint-disable-next-line no-process-env
  if (
    // eslint-disable-next-line no-process-env
    process.env.CLICKHOUSE_TTL_TABLES ||
    // eslint-disable-next-line no-process-env
    process.env.CLICKHOUSE_TTL_DAILY_MV_TABLES ||
    // eslint-disable-next-line no-process-env
    process.env.CLICKHOUSE_TTL_HOURLY_MV_TABLES ||
    // eslint-disable-next-line no-process-env
    process.env.CLICKHOUSE_TTL_MINUTELY_MV_TABLES
  ) {
    console.log('Applying clickhouse retention settings...');
    try {
      await updateRetention();
    } catch (error) {
      console.error('Failed to update retention (non-fatal):', error);
    }
  }

  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
