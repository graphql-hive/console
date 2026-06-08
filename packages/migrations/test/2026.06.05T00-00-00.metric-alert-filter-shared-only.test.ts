import assert from 'node:assert';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { ForeignKeyIntegrityConstraintViolationError, psql } from '@hive/postgres';
import { initMigrationTestingEnvironment } from './utils/testkit';

const idRow = z.object({ id: z.string() });
const countRow = z.object({ c: z.number() });

await describe('migration: metric-alert-filter-shared-only', async () => {
  await test('blocks deleting an in-use saved filter, allows it once detached', async () => {
    const { db, runTo, complete, seed, done } = await initMigrationTestingEnvironment();

    try {
      // Schema up to (and including) metric-alert-rules; our migration (the FK swap)
      // has NOT run yet.
      await runTo('2026.04.15T00-00-01.metric-alert-rules.ts');

      const user = await seed.user({ user: { name: 'u1', email: 'u1@test.com' } });
      const org = await seed.organization({ organization: { name: 'org-1' }, user });
      const project = await seed.project({
        project: { name: 'p1', type: 'SINGLE' },
        organization: org,
      });
      const target = await seed.target({ project, target: { name: 't1' } });

      const filter = await db
        .one(
          psql`
            INSERT INTO saved_filters (project_id, created_by_user_id, name, filters, visibility)
            VALUES (${project.id}, ${user.id}, 'shared-filter', '{}', 'shared')
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
              state, confirmation_minutes, saved_filter_id
            ) VALUES (
              ${org.id}, ${project.id}, ${target.id}, 'TRAFFIC', 60,
              'FIXED_VALUE', 100, 'ABOVE', 'WARNING', 'rule', true,
              'NORMAL', 0, ${filter.id}
            )
            RETURNING id
          `,
        )
        .then(idRow.parse);

      // Apply our migration: the saved_filter_id FK becomes ON DELETE NO ACTION.
      await complete();

      // In use -> a direct delete is blocked at the DB layer by the ON DELETE
      // NO ACTION FK (the hard backstop behind the API's friendly pre-check).
      await assert.rejects(
        db.query(psql`DELETE FROM saved_filters WHERE id = ${filter.id}`),
        ForeignKeyIntegrityConstraintViolationError,
      );

      // Detach (delete the rule) -> the filter is unreferenced and now deletable.
      await db.query(psql`DELETE FROM metric_alert_rules WHERE id = ${rule.id}`);
      await db.query(psql`DELETE FROM saved_filters WHERE id = ${filter.id}`);
    } finally {
      // Close the test-db pool before done() drops the database, otherwise the
      // lingering session makes DROP DATABASE fail with "session in use".
      await db.end().catch(() => {});
      await done();
    }
  });

  // NO ACTION (not RESTRICT) must still let a
  // project be deleted even when one of its filters is attached to an alert. The
  // project delete cascades to BOTH metric_alert_rules and saved_filters (each via
  // project_id); RESTRICT would abort it because the in-use filter can't be deleted,
  // whereas NO ACTION defers the check until the referencing rule is already gone.
  await test('project deletion cascades through an in-use filter (NO ACTION, not RESTRICT)', async () => {
    const { db, runTo, complete, seed, done } = await initMigrationTestingEnvironment();

    try {
      await runTo('2026.04.15T00-00-01.metric-alert-rules.ts');

      const user = await seed.user({ user: { name: 'u2', email: 'u2@test.com' } });
      const org = await seed.organization({ organization: { name: 'org-2' }, user });
      const project = await seed.project({
        project: { name: 'p2', type: 'SINGLE' },
        organization: org,
      });
      const target = await seed.target({ project, target: { name: 't2' } });

      const sharedFilter = await db
        .one(
          psql`
            INSERT INTO saved_filters (project_id, created_by_user_id, name, filters, visibility)
            VALUES (${project.id}, ${user.id}, 'shared-filter', '{}', 'shared')
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
              state, confirmation_minutes, saved_filter_id
            ) VALUES (
              ${org.id}, ${project.id}, ${target.id}, 'TRAFFIC', 60,
              'FIXED_VALUE', 100, 'ABOVE', 'WARNING', 'rule', true,
              'NORMAL', 0, ${sharedFilter.id}
            )
            RETURNING id
          `,
        )
        .then(idRow.parse);

      await complete();

      // The crux: this must NOT throw a foreign-key violation.
      await db.query(psql`DELETE FROM projects WHERE id = ${project.id}`);

      // The cascade removed the rule and the (in-use) filter along with the project.
      const filters = await db
        .one(psql`SELECT count(*)::int as c FROM saved_filters WHERE id = ${sharedFilter.id}`)
        .then(countRow.parse);
      assert.equal(filters.c, 0);
      const rules = await db
        .one(psql`SELECT count(*)::int as c FROM metric_alert_rules WHERE id = ${rule.id}`)
        .then(countRow.parse);
      assert.equal(rules.c, 0);
    } finally {
      await db.end().catch(() => {});
      await done();
    }
  });
});
