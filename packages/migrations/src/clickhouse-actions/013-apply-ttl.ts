import { z } from 'zod';
import type { Action } from '../clickhouse';

const SystemTablesModel = z.array(
  z.object({
    name: z.string(),
    uuid: z.string(),
  }),
);

const InnerTablesModel = z.array(
  z.object({
    name: z.string(),
    engine_full: z.string(),
  }),
);

const StateTableModel = z.array(
  z.object({
    table: z.string(),
    cleaned: z.boolean(),
  }),
);

export const action: Action = async (exec, query) => {
  // Create a table to store the state of the migration
  await exec(`
    CREATE TABLE IF NOT EXISTS default.migration_apply_ttl (
      table String,
      cleaned Bool DEFAULT false,
      version UInt8
    ) ENGINE = ReplacingMergeTree(version) ORDER BY table
  `);

  // If a row is already present and has a higher version number (expired rows were dropped), it won't be inserted
  await exec(`
    INSERT INTO default.migration_apply_ttl (table, version) VALUES
      ('operations_daily', 1),
      ('coordinates_daily', 1),
      ('clients_daily', 1),
      ('subscription_operations_daily', 1),
      ('operations_hourly', 1),
      ('coordinates_hourly', 1),
      ('clients_hourly', 1),
      ('operations_minutely', 1),
      ('coordinates_minutely', 1),
      ('clients_minutely', 1)
  `);

  // daily
  await applyTTL('operations_daily', 'INTERVAL 1 YEAR');
  await applyTTL('coordinates_daily', 'INTERVAL 1 YEAR');
  await applyTTL('clients_daily', 'INTERVAL 1 YEAR');
  await applyTTL('subscription_operations_daily', 'INTERVAL 1 YEAR');

  // hourly
  await applyTTL('operations_hourly', 'INTERVAL 30 DAY');
  await applyTTL('coordinates_hourly', 'INTERVAL 30 DAY');
  await applyTTL('clients_hourly', 'INTERVAL 30 DAY');

  // minutely
  await applyTTL('operations_minutely', 'INTERVAL 24 HOUR');
  await applyTTL('coordinates_minutely', 'INTERVAL 24 HOUR');
  await applyTTL('clients_minutely', 'INTERVAL 24 HOUR');

  console.log('Dropping migration state table');
  await exec(`
    DROP TABLE default.migration_apply_ttl
  `);

  async function applyTTL(tableName: string, interval: string) {
    const table = await querySystemTable(tableName);
    const innerTable = await queryInnerTable(table.uuid, table.name);

    if (hasTTL(innerTable.engine_full)) {
      console.log('TTL already applied to:', tableName);
      return;
    }

    await exec(`
      ALTER TABLE "${innerTable.name}" MODIFY TTL timestamp + ${interval};
    `);

    await dropOldRows(table.uuid, tableName, interval);
  }

  async function querySystemTable(tableName: string) {
    const [table] = await query(`
      SELECT uuid, name
      FROM system.tables
      WHERE
        database = 'default'
        AND name = '${tableName}'
      LIMIT 1
    `).then(async r => SystemTablesModel.parse(r.data));

    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    return table;
  }

  async function queryInnerTable(uuid: string, tableName: string) {
    const [table] = await query(`
      SELECT name, engine_full
      FROM system.tables
      WHERE
        database = 'default'
        AND name = '.inner_id.${uuid}'
      LIMIT 1
    `).then(async r => InnerTablesModel.parse(r.data));

    if (!table) {
      throw new Error(`Inner table of ${tableName} not found`);
    }

    return table;
  }

  async function dropOldRows(uuid: string, tableName: string, interval: string) {
    const [state] = await query(`
      SELECT table, cleaned FROM default.migration_apply_ttl WHERE table = '${tableName}' ORDER BY version DESC LIMIT 1
    `).then(r => StateTableModel.parse(r.data));

    if (state.cleaned) {
      console.log('Old rows already deleted from:', tableName);
      return;
    }

    console.log('Deleting old rows from:', tableName);

    await exec(
      `
        DELETE FROM ".inner_id.${uuid}" WHERE timestamp < now() - ${interval}
      `,
      {
        // execute asynchronously
        lightweight_deletes_sync: '0',
      },
    );

    console.log('Deleted old rows from', tableName);
    await exec(`
      INSERT INTO default.migration_apply_ttl (table, cleaned, version) VALUES ('${tableName}', true, 2);
    `);
    console.log('Marked as cleaned:', tableName);
  }
};

function hasTTL(engineFull: string) {
  return engineFull.replace(/[\n\t]/g, ' ').includes(' TTL ');
}
