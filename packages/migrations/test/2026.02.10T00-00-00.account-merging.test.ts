import assert from 'node:assert';
import { describe, test } from 'node:test';
import { sql, type DatabasePool } from 'slonik';
import type * as DbTypes from '../../services/storage/src/db/types';
import { initMigrationTestingEnvironment } from './utils/testkit';

await describe('migration: account-merging', async () => {
  await test('all cases pass in a mixed situation', async () => {
    const { db, runTo, seed, done } = await initMigrationTestingEnvironment();

    const runCases = async (cases: ((id: string) => Promise<() => Promise<void>>)[]) => {
      await runTo('2026.01.30T10-00-00.oidc-require-invitation.ts');
      const assertions = await Promise.all(cases.map(setup => setup(crypto.randomUUID())));
      await runTo('2026.02.10T00-00-00.account-merging.ts');
      for (const assertion of assertions) {
        await assertion();
      }
    };

    const membershipMergingCase = makeMembershipMergingCaseBuilder(db, seed);

    await runCases([
      // a user with no mergeable users does not get affected
      async caseId => {
        const user = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });

        return async () => {
          assert.deepStrictEqual(
            await db.one(sql`SELECT * FROM users WHERE id = ${user.id}`),
            user,
          );
        };
      },
      // a user with empty mergeable users gets merged into itself
      async caseId => {
        const user = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });
        const mergeableUser = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });
        const mergeableUser2 = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });

        return async () => {
          assert.deepStrictEqual(
            await db.one(sql`SELECT supertoken_user_id FROM users WHERE id = ${user.id}`),
            { supertoken_user_id: null },
          );
          assert.deepStrictEqual(
            await db.maybeOne(sql`SELECT * FROM users WHERE id = ${mergeableUser.id}`),
            null,
          );
          assert.deepStrictEqual(
            await db.maybeOne(sql`SELECT * FROM users WHERE id = ${mergeableUser2.id}`),
            null,
          );
          assert.deepStrictEqual(
            await db.many(sql`
              SELECT user_id, identity_id
              FROM users_linked_identities WHERE user_id = ${user.id}
            `),
            [
              { user_id: user.id, identity_id: user.supertoken_user_id },
              { user_id: user.id, identity_id: mergeableUser.supertoken_user_id },
              { user_id: user.id, identity_id: mergeableUser2.supertoken_user_id },
            ],
          );
        };
      },
      // org ownership correctly migrates when the primary user is empty and the mergeable user owns the org
      async caseId => {
        const primaryUser = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });
        const mergeableUser = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });

        const { org } = await setupOrganization(db, {
          name: `test-${caseId}`,
          ownerId: mergeableUser.id,
        });

        return async () => {
          assert.deepStrictEqual(
            await db.maybeOne(sql`SELECT * FROM users WHERE id = ${mergeableUser.id}`),
            null,
          );
          assert.deepStrictEqual(
            await db.one(sql`SELECT user_id FROM organizations WHERE id = ${org.id}`),
            { user_id: primaryUser.id },
          );
        };
      },
      // org membership correctly migrates when users are members of different orgs
      async caseId => {
        const owner = await seed.user({
          user: {
            name: 'owner',
            email: `owner-${caseId}@test.com`,
          },
        });
        const primaryUser = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });
        const mergeableUser = await seed.user({
          user: {
            name: 'test',
            email: `${caseId}@test.com`,
          },
        });

        const org1 = await setupOrganization(db, {
          name: `test1-${caseId}`,
          ownerId: owner.id,
        });
        const org2 = await setupOrganization(db, {
          name: `test2-${caseId}`,
          ownerId: owner.id,
        });

        await org1.joinMember(primaryUser.id, org1.roles.Admin.id);
        await org2.joinMember(mergeableUser.id, org2.roles.Viewer.id);

        return async () => {
          assert.deepStrictEqual(
            await db.one(sql`
              SELECT omr.name role_name
              FROM organization_member om
              LEFT JOIN organization_member_roles omr
              ON om.role_id = omr.id
              WHERE om.organization_id = ${org1.org.id}
              AND om.user_id = ${primaryUser.id}
            `),
            { role_name: 'Admin' },
          );
          assert.deepStrictEqual(
            await db.one(sql`
              SELECT omr.name role_name
              FROM organization_member om
              LEFT JOIN organization_member_roles omr
              ON om.role_id = omr.id
              WHERE om.organization_id = ${org2.org.id}
              AND om.user_id = ${primaryUser.id}
            `),
            { role_name: 'Viewer' },
          );
          assert.deepStrictEqual(
            await db.maybeOne(sql`
              SELECT * FROM organization_member
              WHERE organization_id = ${org2.org.id}
              AND user_id = ${mergeableUser.id}
            `),
            null,
          );
        };
      },
      // non-Admin memberships merge into Admin if any
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'Admin' },
          { roleName: 'OrgRead', scopes: ['organization:read'] },
          { roleName: 'ProjDesc', permissions: ['project:describe'] },
        ],
        { roleName: 'Admin' },
      ),
      // Viewer memberships merge into custom scope membership if any
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'OrgRead', scopes: ['organization:read'] },
          { roleName: 'Viewer' },
        ],
        { roleName: 'OrgRead', scopes: ['organization:read'] },
      ),
      // Viewer memberships merge into custom permission membership if any
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'ProjDesc', permissions: ['project:describe'] },
          { roleName: 'Viewer' },
        ],
        { roleName: 'ProjDesc', permissions: ['project:describe'] },
      ),
      // Viewer and custom scope memberships merge into a superset membership if any
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'Subset1', scopes: ['organization:read'] },
          { roleName: 'Superset', scopes: ['organization:read', 'project:read', 'target:read'] },
          { roleName: 'Viewer' },
          { roleName: 'Subset2', scopes: ['project:read', 'organization:read'] },
        ],
        { roleName: 'Superset', scopes: ['organization:read', 'project:read', 'target:read'] },
      ),
      // Viewer and custom permission memberships merge into a superset membership if any
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'Subset1', permissions: ['project:describe'] },
          {
            roleName: 'Superset',
            permissions: ['project:describe', 'member:describe', 'billing:describe'],
          },
          { roleName: 'Viewer' },
          { roleName: 'Subset2', permissions: ['member:describe', 'billing:describe'] },
        ],
        {
          roleName: 'Superset',
          permissions: ['project:describe', 'member:describe', 'billing:describe'],
        },
      ),
      // merging ends with noop if conflicts
      membershipMergingCase(
        [
          { roleName: 'Viewer' },
          { roleName: 'Scopes', scopes: ['organization:read'] },
          { roleName: 'Viewer' },
          { roleName: 'Permissions', permissions: ['project:describe'] },
        ],
        null,
      ),
    ]).finally(() => done());
  });
});

async function setupOrganization(
  db: DatabasePool,
  args: {
    name: string;
    ownerId: string;
  },
) {
  const org = await db.one<DbTypes.organizations>(sql`
		INSERT INTO organizations (name, clean_id, user_id)
    VALUES (${args.name}, ${args.name}, ${args.ownerId}) RETURNING *
  `);
  const roles = await db
    .any<DbTypes.organization_member_roles>(
      sql`
        INSERT INTO organization_member_roles (
          organization_id
          , name
          , description
          , locked
        ) VALUES (
          ${org.id}
          , 'Admin'
          , 'Full access to all organization resources'
          , true
        ), (
          ${org.id}
          , 'Viewer'
          , 'Read-only access to all organization resources'
          , true
        ) RETURNING *
      `,
    )
    .then(roles => Object.fromEntries(roles.map(role => [role.name, role])));

  const joinMember = async (userId: string, roleId: string) => {
    return await db.one<DbTypes.organization_member>(sql`
      INSERT INTO organization_member (organization_id, user_id, role_id)
      VALUES (${org.id}, ${userId}, ${roleId}) RETURNING *
    `);
  };
  await joinMember(args.ownerId, roles.Admin.id);

  return {
    org,
    roles,
    joinMember,
    async createRole(name: string, config: { scopes: string[] } | { permissions: string[] }) {
      return await db.one<DbTypes.organization_member_roles>(sql`
        INSERT INTO organization_member_roles (
          organization_id
          , name
          , description
          , scopes
          , permissions
        ) VALUES (
          ${org.id}
          , ${name}
          , ${name}
          , ${'scopes' in config ? sql.array(config.scopes, 'text') : null}
          , ${'permissions' in config ? sql.array(config.permissions, 'text') : null}
        ) RETURNING *
      `);
    },
  };
}

type Seed = Awaited<ReturnType<typeof initMigrationTestingEnvironment>>['seed'];
type Membership = { roleName: string } & (
  | Record<never, never>
  | { scopes: string[] }
  | { permissions: string[] }
);

function makeMembershipMergingCaseBuilder(db: DatabasePool, seed: Seed) {
  return (inputs: Membership[], result: Membership | null) => async (caseId: string) => {
    const owner = await seed.user({
      user: {
        name: 'owner',
        email: `owner-${caseId}@test.com`,
      },
    });

    const { org, roles, joinMember, createRole } = await setupOrganization(db, {
      name: `test-${caseId}`,
      ownerId: owner.id,
    });

    const members: {
      user: DbTypes.users;
      membership: DbTypes.organization_member;
      role: DbTypes.organization_member_roles;
    }[] = [];
    for (const input of inputs) {
      const user = await seed.user({
        user: {
          name: `test`,
          email: `${caseId}@test.com`,
        },
      });
      const role =
        'scopes' in input || 'permissions' in input
          ? await createRole(input.roleName, input)
          : roles[input.roleName];

      const membership = await joinMember(user.id, role.id);
      members.push({ user, membership, role });
    }
    const [primaryMember, ...mergeableMembers] = members;

    return async () => {
      if (result) {
        assert.deepStrictEqual(
          await db.one(sql`
            SELECT
              omr.name "roleName"
              , omr.scopes "scopes"
              , omr.permissions "permissions"
            FROM organization_member om
            LEFT JOIN organization_member_roles omr
            ON om.role_id = omr.id
            WHERE om.organization_id = ${org.id}
            AND om.user_id = ${primaryMember.user.id}
          `),
          {
            scopes: null,
            permissions: null,
            ...result,
          },
        );
        for (const { user } of mergeableMembers) {
          assert.deepStrictEqual(
            await db.maybeOne(sql`
              SELECT * FROM organization_member
              WHERE organization_id = ${org.id}
              AND user_id = ${user.id}
            `),
            null,
          );
        }
      } else {
        for (const member of members) {
          assert.deepStrictEqual(
            await db.one(sql`
              SELECT * FROM "users" WHERE id = ${member.user.id}
            `),
            member.user,
          );
          assert.deepStrictEqual(
            await db.one(sql`
              SELECT * FROM organization_member
              WHERE organization_id = ${member.membership.organization_id}
              AND user_id = ${member.membership.user_id}
            `),
            member.membership,
          );
          assert.deepStrictEqual(
            await db.one(sql`
              SELECT * FROM organization_member_roles
              WHERE id = ${member.role.id}
            `),
            member.role,
          );
        }
      }
    };
  };
}
