import assert from 'node:assert';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { psql } from '@hive/postgres';
import { initMigrationTestingEnvironment } from './utils/testkit';

const GraphRowModel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['BASE', 'CONTRACT']),
  config: z.unknown(),
  source_graph_id: z.string().nullable(),
  is_backfilled: z.boolean(),
});

await describe('migration: backfill-graphs', async () => {
  await test('backfills default and enabled contract graphs for existing targets', async () => {
    const { db, runTo, complete, seed, done } = await initMigrationTestingEnvironment();

    try {
      await runTo('2026.09.24T00-00-01.schema-versions-action-id-nullability.ts');

      const user = await seed.user({ user: { name: 'u1', email: 'u1@test.com' } });
      const organization = await seed.organization({ organization: { name: 'org-1' }, user });
      const project = await seed.project({
        project: { name: 'p1', type: 'FEDERATION' },
        organization,
      });
      const target = await seed.target({ project, target: { name: 't1' } });

      await db.query(psql`
        INSERT INTO contracts (
          target_id,
          contract_name,
          include_tags,
          exclude_tags,
          remove_unreachable_types_from_public_api_schema,
          is_disabled
        ) VALUES
          (${target.id}, 'public', ARRAY['public'], ARRAY['internal'], true, false),
          (${target.id}, 'disabled', NULL, NULL, false, true)
      `);

      await complete();

      const graphs = await db
        .any(
          psql`
          SELECT id, name, type, config, source_graph_id, is_backfilled
          FROM graphs
          WHERE target_id = ${target.id}
          ORDER BY name
        `,
        )
        .then(z.array(GraphRowModel).parse);

      assert.equal(graphs.length, 2);

      const defaultGraph = graphs.find(graph => graph.name === 'default');
      assert.ok(defaultGraph);
      assert.deepEqual(defaultGraph, {
        id: defaultGraph.id,
        name: 'default',
        type: 'BASE',
        config: null,
        source_graph_id: null,
        is_backfilled: true,
      });

      const contractGraph = graphs.find(graph => graph.name === 'default/public');
      assert.ok(contractGraph);
      assert.deepEqual(contractGraph, {
        id: contractGraph.id,
        name: 'default/public',
        type: 'CONTRACT',
        config: {
          includeTags: ['public'],
          excludeTags: ['internal'],
          removeUnreachableTypesFromPublicApiSchema: true,
          isDisabled: false,
        },
        source_graph_id: defaultGraph.id,
        is_backfilled: true,
      });
    } finally {
      await db.end().catch(() => {});
      await done();
    }
  });
});
