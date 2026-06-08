import assert from 'node:assert';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { ForeignKeyIntegrityConstraintViolationError, psql } from '@hive/postgres';
import { initMigrationTestingEnvironment } from './utils/testkit';

const idRow = z.object({ id: z.string() });
const savedFilterIdRow = z.object({ saved_filter_id: z.string().nullable() });

await describe('migration: metric-alert-filter-shared-only', async () => {
  await test('detaches private-filter refs, keeps shared, and blocks deleting an in-use filter', async () => {
    const { db, runTo, complete, seed, done } = await initMigrationTestingEnvironment();

    try {
      // Schema up to (and including) metric-alert-rules: both tables exist, the FK
      // is still ON DELETE SET NULL, and our migration has NOT run yet.
      await runTo('2026.04.15T00-00-01.metric-alert-rules.ts');

      const user = await seed.user({ user: { name: 'u1', email: 'u1@test.com' } });
      const org = await seed.organization({ organization: { name: 'org-1' }, user });
      const project = await seed.project({
        project: { name: 'p1', type: 'SINGLE' },
        organization: org,
      });
      const target = await seed.target({ project, target: { name: 't1' } });

      const insertFilter = (name: string, visibility: 'private' | 'shared') =>
        db
          .one(
            psql`
              INSERT INTO saved_filters (project_id, created_by_user_id, name, filters, visibility)
              VALUES (${project.id}, ${user.id}, ${name}, '{}', ${visibility})
              RETURNING id
            `,
          )
          .then(idRow.parse);

      const privateFilter = await insertFilter('private-filter', 'private');
      const sharedFilter = await insertFilter('shared-filter', 'shared');

      const insertRule = (name: string, savedFilterId: string) =>
        db
          .one(
            psql`
              INSERT INTO metric_alert_rules (
                organization_id, project_id, target_id, type, time_window_minutes,
                threshold_type, threshold_value, direction, severity, name, enabled,
                state, confirmation_minutes, saved_filter_id
              ) VALUES (
                ${org.id}, ${project.id}, ${target.id}, 'TRAFFIC', 60,
                'FIXED_VALUE', 100, 'ABOVE', 'WARNING', ${name}, true,
                'NORMAL', 0, ${savedFilterId}
              )
              RETURNING id
            `,
          )
          .then(idRow.parse);

      const ruleWithPrivate = await insertRule('rule-private', privateFilter.id);
      const ruleWithShared = await insertRule('rule-shared', sharedFilter.id);

      // Apply our migration (the only one complete() runs after the runTo above is
      // unrelated, plus ours last).
      await complete();

      // 1. The alert referencing the PRIVATE filter is detached (preserves today's
      //    all-operations behavior instead of suddenly narrowing scope).
      const afterPrivate = await db
        .one(psql`SELECT saved_filter_id FROM metric_alert_rules WHERE id = ${ruleWithPrivate.id}`)
        .then(savedFilterIdRow.parse);
      assert.equal(afterPrivate.saved_filter_id, null);

      // 2. The alert referencing the SHARED filter is left intact.
      const afterShared = await db
        .one(psql`SELECT saved_filter_id FROM metric_alert_rules WHERE id = ${ruleWithShared.id}`)
        .then(savedFilterIdRow.parse);
      assert.equal(afterShared.saved_filter_id, sharedFilter.id);

      // 3. The shared filter is in use -> a direct delete is blocked at the DB layer
      //    by the ON DELETE NO ACTION FK (the hard backstop behind the API's
      //    friendly pre-check).
      await assert.rejects(
        db.query(psql`DELETE FROM saved_filters WHERE id = ${sharedFilter.id}`),
        ForeignKeyIntegrityConstraintViolationError,
      );

      // 4. The now-detached private filter is unreferenced -> still deletable.
      await db.query(psql`DELETE FROM saved_filters WHERE id = ${privateFilter.id}`);
    } finally {
      // Close the test-db pool before done() drops the database, otherwise the
      // lingering session makes DROP DATABASE fail with "session in use".
      await db.end().catch(() => {});
      await done();
    }
  });

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
      const countRow = z.object({ c: z.number() });
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
