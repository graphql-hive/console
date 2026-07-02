import assert from 'node:assert';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { psql } from '@hive/postgres';
import { initMigrationTestingEnvironment } from './utils/testkit';

const idRow = z.object({ id: z.string() });
const countRow = z.object({ c: z.number() });

await describe('migration: metric-alert-channel-health', async () => {
  await test('creates the table + index and cascades on rule/channel delete', async () => {
    const { db, runTo, complete, seed, done } = await initMigrationTestingEnvironment();

    try {
      // Schema up to (and including) metric-alert-rules; our table has NOT been
      // created yet.
      await runTo('2026.04.15T00-00-01.metric-alert-rules.ts');

      const user = await seed.user({ user: { name: 'u1', email: 'u1@test.com' } });
      const org = await seed.organization({ organization: { name: 'org-1' }, user });
      const project = await seed.project({
        project: { name: 'p1', type: 'SINGLE' },
        organization: org,
      });
      const target = await seed.target({ project, target: { name: 't1' } });

      const channel = await db
        .one(
          psql`
            INSERT INTO alert_channels (project_id, type, name, webhook_endpoint)
            VALUES (${project.id}, 'WEBHOOK', 'wh', 'https://example.test/hook')
            RETURNING id
          `,
        )
        .then(idRow.parse);

      const rule = await db
        .one(
          psql`
            INSERT INTO metric_alert_rules (
              organization_id, project_id, target_id, type, time_window_minutes,
              threshold_type, threshold_value, direction, severity, name, enabled,
              state, confirmation_minutes
            ) VALUES (
              ${org.id}, ${project.id}, ${target.id}, 'TRAFFIC', 60,
              'FIXED_VALUE', 100, 'ABOVE', 'WARNING', 'rule', true,
              'NORMAL', 0
            )
            RETURNING id
          `,
        )
        .then(idRow.parse);

      // Apply our migration: metric_alert_channel_health is created.
      await complete();

      // The index exists (FK-cascade index on alert_channel_id).
      const idx = await db
        .one(
          psql`
            SELECT count(*)::int as c FROM pg_indexes
            WHERE indexname = 'idx_metric_alert_channel_health_channel'
          `,
        )
        .then(countRow.parse);
      assert.equal(idx.c, 1);

      await db.query(psql`
        INSERT INTO metric_alert_channel_health (metric_alert_rule_id, alert_channel_id, last_error)
        VALUES (${rule.id}, ${channel.id}, 'HTTP 503')
      `);

      // PK is (rule, channel): a second bare insert for the same pair conflicts.
      await assert.rejects(
        db.query(psql`
          INSERT INTO metric_alert_channel_health (metric_alert_rule_id, alert_channel_id)
          VALUES (${rule.id}, ${channel.id})
        `),
      );

      // Deleting the channel cascades the health row away.
      await db.query(psql`DELETE FROM alert_channels WHERE id = ${channel.id}`);
      const afterChannelDelete = await db
        .one(
          psql`SELECT count(*)::int as c FROM metric_alert_channel_health WHERE metric_alert_rule_id = ${rule.id}`,
        )
        .then(countRow.parse);
      assert.equal(afterChannelDelete.c, 0);

      // Re-create the pair, then delete the rule — also cascades.
      const channel2 = await db
        .one(
          psql`
            INSERT INTO alert_channels (project_id, type, name, webhook_endpoint)
            VALUES (${project.id}, 'WEBHOOK', 'wh2', 'https://example.test/hook2')
            RETURNING id
          `,
        )
        .then(idRow.parse);
      await db.query(psql`
        INSERT INTO metric_alert_channel_health (metric_alert_rule_id, alert_channel_id)
        VALUES (${rule.id}, ${channel2.id})
      `);
      await db.query(psql`DELETE FROM metric_alert_rules WHERE id = ${rule.id}`);
      const afterRuleDelete = await db
        .one(psql`SELECT count(*)::int as c FROM metric_alert_channel_health`)
        .then(countRow.parse);
      assert.equal(afterRuleDelete.c, 0);
    } finally {
      // Close the test-db pool before done() drops the database, otherwise the
      // lingering session makes DROP DATABASE fail with "session in use".
      await db.end().catch(() => {});
      await done();
    }
  });
});
