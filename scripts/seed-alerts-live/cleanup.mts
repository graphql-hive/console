#!/usr/bin/env -S tsx
// See ./README.md for what this script does and how to run it.
// Deletions cascade through every dependent table (projects, targets, rules,
// channels, state-log entries, etc.) via the existing FK CASCADE wiring.
// `reflect-metadata` polyfill: required because @hive/postgres transitively
// imports graphql-modules, which uses TS decorators. Same pattern the
// existing seed + integration tests use.
import 'reflect-metadata';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../../integration-tests/local-dev.ts');

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');
const { getSeedPGConnectionString } = await import('../utils/get-or-create-auth');

async function main() {
  const pool = await createPostgresDatabasePool({
    connectionParameters: getSeedPGConnectionString(),
  });

  try {
    // The org slug column is named `clean_id` in PG; the rest of the
    // codebase aliases it as `slug` in SELECTs. Match that pattern here so
    // the readable log lines below don't need a separate column name.
    const rows = await pool.any(psql`
      SELECT "id", "clean_id" AS "slug"
      FROM "organizations"
      WHERE "clean_id" LIKE 'live-alerts-demo-%'
      ORDER BY "clean_id"
    `);

    if (rows.length === 0) {
      console.log('No live-alerts-demo-* organizations found. Nothing to clean up.');
      return;
    }

    console.log(`🧹 Found ${rows.length} live-alerts-demo-* organization(s):`);
    for (const row of rows as Array<{ id: string; slug: string }>) {
      console.log(`   - ${row.slug}`);
    }

    await pool.query(psql`
      DELETE FROM "organizations"
      WHERE "clean_id" LIKE 'live-alerts-demo-%'
    `);
    console.log(`✓ Deleted ${rows.length} organization(s) (FK cascade handles the rest).`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('💥 Cleanup failed:', err);
  process.exit(1);
});
