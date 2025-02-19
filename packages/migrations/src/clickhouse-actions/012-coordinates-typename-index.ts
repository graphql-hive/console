import { z } from 'zod';
import type { Action } from '../clickhouse';

const SystemTablesModel = z.array(
  z.object({
    name: z.string(),
    uuid: z.string(),
  }),
);

const StateTableModel = z.array(
  z.object({
    table: z.string(),
    idx_created: z.boolean(),
    idx_materialized: z.boolean(),
  }),
);

// This migration adds an index for the `coordinate` field.
// Improve the performance of the queries that filter the rows by the type's name.
//
// For example, when looking for `Member.*` coordinates we elimiate the need to scan the whole table,
// by laveraging the idx_typename index.
// We filter rows by the first part of the `coordinate` field (substringIndex(coordinate, '.', 1)).
export const action: Action = async (exec, query) => {
  // Create a table to store the state of the migration
  await exec(`
    CREATE TABLE IF NOT EXISTS default.migration_coordinates_typename_index (
      table String,
      idx_created Bool DEFAULT false,
      idx_materialized Bool DEFAULT false
    ) ENGINE = MergeTree()
  `);

  const tables = await query(`
    SELECT uuid, name FROM system.tables WHERE name IN (
      'coordinates_daily',
      'coordinates_hourly',
      'coordinates_minutely'
    );
  `).then(async r => SystemTablesModel.parse(r.data));

  if (tables.length !== 3) {
    throw new Error('Expected 3 tables');
  }

  const tableStates = await query(`
    SELECT table, idx_created, idx_materialized FROM default.migration_coordinates_typename_index
  `).then(async r => StateTableModel.parse(r.data));

  for (const { uuid, name } of tables) {
    let state = tableStates.find(s => s.table === name);

    if (!state) {
      console.log(`Creating state for table ${name}`);
      await exec(`
        INSERT INTO default.migration_coordinates_typename_index (table) VALUES ('${name}')
      `);

      state = { table: name, idx_created: false, idx_materialized: false };
    }

    const innerTable = `.inner_id.${uuid}`;

    if (state.idx_created) {
      console.log(`Skipping idx_typename for table ${name}`);
    } else {
      console.log(`Creating idx_typename for table ${name}`);
      await exec(
        `ALTER TABLE "${innerTable}" ADD INDEX idx_typename (substringIndex(coordinate, '.', 1)) TYPE ngrambf_v1(4, 1024, 2, 0) GRANULARITY 1`,
      );
      await exec(
        `UPDATE default.migration_coordinates_typename_index SET idx_created = true WHERE table = '${name}'`,
      );
    }

    if (state.idx_materialized) {
      console.log(`Skipping materializing idx_typename for table ${name}`);
    } else {
      console.log(`Materializing idx_typename for table ${name}`);
      await exec(`ALTER TABLE "${innerTable}" MATERIALIZE INDEX idx_typename`);
      await exec(
        `UPDATE default.migration_coordinates_typename_index SET idx_materialized = true WHERE table = '${name}'`,
      );
    }
  }

  // Drop the state table
  await exec(`
    DROP TABLE default.migration_coordinates_typename_index
  `);
};
