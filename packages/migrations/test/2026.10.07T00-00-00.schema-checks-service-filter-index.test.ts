import assert from 'node:assert';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { psql } from '@hive/postgres';
import { initMigrationTestingEnvironment } from './utils/testkit';

await describe('migration: schema-checks-service-filter-index', async () => {
  await test('indexes checks by target and service in the list order', async () => {
    const { db, complete, done } = await initMigrationTestingEnvironment();

    try {
      await complete();

      const indexdef = await db
        .oneFirst(
          psql`
            SELECT indexdef
            FROM pg_indexes
            WHERE tablename = 'schema_checks'
              AND indexname = 'schema_checks_connection_pagination_by_service'
          `,
        )
        .then(z.string().parse);

      assert.match(indexdef, /\(target_id, service_name, created_at DESC, id DESC\)/);
      assert.match(indexdef, /WHERE \(service_name IS NOT NULL\)/);

      // The list query, as storage orders it. On an empty table the planner prefers a seq scan,
      // so turn that off to see whether the index can serve the order without a sort step.
      const plan = await db.transaction('explain', async tx => {
        await tx.query(psql`SET LOCAL enable_seqscan = off`);
        return tx.anyFirst(psql`
          EXPLAIN
          SELECT id FROM schema_checks
          WHERE target_id = '00000000-0000-0000-0000-000000000000' AND service_name = 'users'
          ORDER BY target_id ASC, created_at DESC, id DESC
          LIMIT 21
        `);
      });
      const planText = z.array(z.string()).parse(plan).join('\n');

      assert.match(
        planText,
        /Index (Only )?Scan using schema_checks_connection_pagination_by_service/,
      );
      assert.doesNotMatch(planText, /Sort/);
    } finally {
      await done();
    }
  });
});
