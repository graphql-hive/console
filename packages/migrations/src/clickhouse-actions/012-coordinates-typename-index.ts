import { z } from 'zod';
import type { Action } from '../clickhouse';

const SystemTablesModel = z.array(
  z.object({
    name: z.string(),
    uuid: z.string(),
  }),
);

const DataSkippingIndicesModel = z.array(
  z.object({
    name: z.string(),
  }),
);

// This migration adds an index for the `coordinate` field.
// Improve the performance of the queries that filter the rows by the type's name.
//
// For example, when looking for `Member.*` coordinates we elimiate the need to scan the whole table,
// by laveraging the idx_typename index.
// We filter rows by the first part of the `coordinate` field (substringIndex(coordinate, '.', 1)).
export const action: Action = async (exec, query, hiveCloudEnvironment) => {
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

  for (const { uuid, name } of tables) {
    console.log(`Creating idx_typename for table ${name}`);
    await exec(
      `ALTER TABLE ".inner_id.${uuid}" ADD INDEX idx_typename (substringIndex(coordinate, '.', 1)) TYPE ngrambf_v1(4, 1024, 2, 0) GRANULARITY 1`,
    );
    const indexes = await query(`
      SELECT name FROM system.data_skipping_indices WHERE table = ${'.inner_id.' + uuid} AND name = 'idx_typename'
    `).then(async r => DataSkippingIndicesModel.parse(r.data));

    if (indexes.some(i => i.name)) {
      console.log(`Materializing the idx_typename for table ${name}`);
      await exec(`ALTER TABLE ".inner_id.${uuid}" MATERIALIZE INDEX idx_typename`);
    } else {
      console.error(`Failed to find idx_typename for table ${name}`);
    }
  }
};
