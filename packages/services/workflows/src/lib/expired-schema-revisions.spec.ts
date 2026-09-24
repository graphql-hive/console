import type { PostgresDatabasePool } from '@hive/postgres';
import { purgeExpiredSchemaRevisions } from './expired-schema-revisions.js';

describe('purgeExpiredSchemaRevisions', () => {
  test('deletes expired unpublished revisions before orphaned SDL artifacts', async () => {
    const queries: string[] = [];
    const transaction = vi.fn(async (_name: string, run: (pool: unknown) => Promise<unknown>) =>
      run({
        any: async (query: { sql: string }) => {
          queries.push(query.sql);
          return [{ digest: 'digest-1' }, { digest: 'digest-1' }];
        },
        oneFirst: async (query: { sql: string }) => {
          queries.push(query.sql);
          return 1;
        },
      }),
    );

    const result = await purgeExpiredSchemaRevisions({
      pool: { transaction } as unknown as PostgresDatabasePool,
      expiresAt: new Date('2026-09-15T03:30:00.000Z'),
    });

    expect(transaction).toHaveBeenCalledWith('purgeExpiredSchemaRevisions', expect.any(Function));
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('DELETE FROM "schema_revisions"');
    expect(queries[0]).toContain('"first_published_at" IS NULL');
    expect(queries[0]).toContain('"expires_at" IS NOT NULL');
    expect(queries[0]).toContain('"expires_at" <= $slonik_1');
    expect(queries[0]).toContain('RETURNING "digest"');
    expect(queries[1]).toContain('DELETE FROM "sdl_artifacts"');
    expect(queries[1]).toContain('"digest" = ANY($slonik_1::"text"[])');
    expect(queries[1]).toContain('AND NOT EXISTS');
    expect(queries[1]).toContain('"schema_revisions"."digest" = "sdl_artifacts"."digest"');
    expect(result).toEqual({
      deletedSchemaRevisionCount: 2,
      deletedSdlArtifactCount: 1,
    });
  });

  test('skips artifact cleanup when no revisions were deleted', async () => {
    const oneFirst = vi.fn();
    const transaction = vi.fn(async (_name: string, run: (pool: unknown) => Promise<unknown>) =>
      run({ any: async () => [], oneFirst }),
    );

    const result = await purgeExpiredSchemaRevisions({
      pool: { transaction } as unknown as PostgresDatabasePool,
      expiresAt: new Date('2026-09-15T03:30:00.000Z'),
    });

    expect(oneFirst).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedSchemaRevisionCount: 0,
      deletedSdlArtifactCount: 0,
    });
  });
});
