import assert from 'node:assert';
import { describe, test } from 'node:test';
import { sql } from 'slonik';
import { createStorage } from '../../services/storage/src/index';
import { initMigrationTestingEnvironment } from './utils/testkit';

await describe('migration: legacy-member-socpes', async () => {
  await test('should assign newly created roles to users without a role, without modifying existing roles', async () => {
    const { db, runTo, complete, done, seed, connectionString } =
      await initMigrationTestingEnvironment();
    const storage = await createStorage(connectionString, 1);
    try {
      // Run migrations all the way to the point before the one we are testing
      await runTo('2023.10.25T14.41.41.schema-checks-dedup.ts');

      // Seed the database with some data (schema_sdl, supergraph_sdl, composite_schema_sdl)
      const admin = await seed.user({
        user: {
          name: 'test1',
          email: 'test1@test.com',
        },
      });
      const contributor = await seed.user({
        user: {
          name: 'test2',
          email: 'test2@test.com',
        },
      });
      const noRoleUser = await seed.user({
        user: {
          name: 'test3',
          email: 'test3@test.com',
        },
      });
      const organization = await seed.organization({
        organization: {
          name: 'org-1',
        },
        user: admin,
      });

      const adminScopes = ['target:read', 'target:delete', 'target:settings', 'taret:write'];
      const contributorScopes = ['target:read', 'taret:write'];
      const noRoleUserScopes = ['target:read', 'target:settings'];

      // Create an invitation to simulate a pending invitation
      await db.query(sql`
        INSERT INTO organization_invitations (organization_id, email) VALUES (${organization.id}, 'invited@test.com')
      `);

      await db.query(sql`
        INSERT INTO organization_member (organization_id, user_id, scopes)
        VALUES
          (${organization.id}, ${admin.id}, ${sql.array(adminScopes, 'text')}),
          (${organization.id}, ${contributor.id}, ${sql.array(contributorScopes, 'text')}),
          (${organization.id}, ${noRoleUser.id}, ${sql.array(noRoleUserScopes, 'text')})
      `);

      // assert correct scopes
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${admin.id}
        `),
        adminScopes,
      );
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${contributor.id}
        `),
        contributorScopes,
      );
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${noRoleUser.id}
        `),
        noRoleUserScopes,
      );

      // run the next migrations
      await runTo('2025.01.02T00-00-00.legacy-user-org-cleanup.ts');

      // assert scopes are still in place and identical
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${admin.id}
        `),
        adminScopes,
      );
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${contributor.id}
        `),
        contributorScopes,
      );
      assert.deepStrictEqual(
        await db.oneFirst(sql`
        SELECT scopes FROM organization_member WHERE user_id = ${noRoleUser.id}
        `),
        noRoleUserScopes,
      );

      // assert assigned roles have identical scopes

      const adminRole = await db.one<{
        scopes: string[];
        id: string;
      }>(sql`
        SELECT omr.scopes, omr.id
        FROM organization_member as om
        LEFT JOIN organization_member_roles as omr ON omr.id = om.role_id
        WHERE om.user_id = ${admin.id} AND omr.organization_id = ${organization.id}
      `);
      assert.deepStrictEqual(adminRole.scopes, adminScopes);

      const contributorRole = await db.one<{
        scopes: string[];
        id: string;
      }>(sql`
        SELECT omr.scopes, omr.id
        FROM organization_member as om
        LEFT JOIN organization_member_roles as omr ON omr.id = om.role_id
        WHERE om.user_id = ${contributor.id} AND omr.organization_id = ${organization.id}
        `);
      assert.deepStrictEqual(contributorRole, contributorScopes);

      // assert no role user has no role
      assert.strictEqual(
        await db.oneFirst(sql`
        SELECT role_id FROM organization_member WHERE user_id = ${noRoleUser.id}
        `),
        null,
      );

      await complete();

      // assert that the migration created a new role for the non-role user
      // and the role has exact same scopes as the user
      const previouslyNoRoleUser = await db.one<{
        scopes: string[];
        name: string;
      }>(sql`
        SELECT omr.scopes, omr.name
        FROM organization_member as om
        LEFT JOIN organization_member_roles as omr ON omr.id = om.role_id
        WHERE om.user_id = ${noRoleUser.id} AND omr.organization_id = ${organization.id}
      `);

      assert.deepStrictEqual(previouslyNoRoleUser.scopes, noRoleUserScopes);

      // assert that the role has the correct name
      assert.match(previouslyNoRoleUser.name, /^Auto Role /);

      // asser that users with roles were not affected,
      // meaning the role was exactly the same as before
      assert.deepStrictEqual(
        await db.oneFirst<string>(sql`
          SELECT omr.id
          FROM organization_member as om
          LEFT JOIN organization_member_roles as omr ON omr.id = om.role_id
          WHERE om.user_id = ${admin.id} AND omr.organization_id = ${organization.id}
        `),
        adminRole.id,
      );

      assert.deepStrictEqual(
        await db.oneFirst<string>(sql`
          SELECT omr.id
          FROM organization_member as om
          LEFT JOIN organization_member_roles as omr ON omr.id = om.role_id
          WHERE om.user_id = ${contributor.id} AND omr.organization_id = ${organization.id}
        `),
        contributorRole.id,
      );
    } finally {
      await done();
      await storage.destroy();
    }
  });
});
