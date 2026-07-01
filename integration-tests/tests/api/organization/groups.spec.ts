import {
  addGroupMappingToGroup,
  createMemberRole,
  getGroupForOrganization,
  getPaginatedGroupsForOrganization,
  removeGroupMapping,
  updateGroupMapping,
} from 'testkit/flow';
import { initSeed } from 'testkit/seed';
import { GroupStore } from '@hive/api/modules/organization/providers/group-store';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { invariant } from '@hive/service-common';

test.describe('Organization.group', () => {
  test.concurrent('fetch non-existing group', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    const result = await getGroupForOrganization(
      org.organization.id,
      crypto.randomUUID(),
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result.organization?.group).toEqual(null);
  });

  test.concurrent('fetch non-existing group (non uuid)', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    const result = await getGroupForOrganization(
      org.organization.id,
      'toyota',
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result.organization?.group).toEqual(null);
  });

  test.concurrent('fetch existing group', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    // create group directly via database store;
    // to avoid SCIM setup etc.
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);
    const createGroupResult = await groupStore.createGroup({
      organizationId: org.organization.id,
      displayName: 'Test Group',
      externalId: null,
    });
    invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

    const result = await getGroupForOrganization(
      org.organization.id,
      createGroupResult.group.id,
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(result.organization?.group).toEqual({
      id: expect.any(String),
      memberCount: 0,
      name: 'Test Group',
      roleMappingCount: 0,
      roleMappings: [],
    });
  });

  test.concurrent('cannot fetch group belonging to different organization', async () => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    // create group directly via database store;
    // to avoid SCIM setup etc.
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);
    const createGroupResult = await groupStore.createGroup({
      organizationId: org.organization.id,
      displayName: 'Test Group',
      externalId: null,
    });
    invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

    const otherOrg = await owner.createOrg();

    const result = await getGroupForOrganization(
      otherOrg.organization.id,
      createGroupResult.group.id,
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result.organization?.group).toEqual(null);
  });
});

test.describe('Organization.groups', () => {
  test.concurrent('can paginate groups', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    // create group directly via database store;
    // to avoid SCIM setup etc.
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);

    for (const letter of ['A', 'B', 'C']) {
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: `Test Group ${letter}`,
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');
    }

    let paginationResult = await getPaginatedGroupsForOrganization(
      owner.ownerToken,
      org.organization.id,
      3,
      null,
    ).then(r => r.expectNoGraphQLErrors());
    expect(paginationResult.organization?.groups.edges).toHaveLength(3);
    expect(paginationResult.organization?.groups.pageInfo.hasNextPage).toEqual(false);
    expect(paginationResult.organization?.groups.edges.map(edge => edge.node.name)).toEqual([
      'Test Group C',
      'Test Group B',
      'Test Group A',
    ]);

    paginationResult = await getPaginatedGroupsForOrganization(
      owner.ownerToken,
      org.organization.id,
      2,
      null,
    ).then(r => r.expectNoGraphQLErrors());
    expect(paginationResult.organization?.groups.edges).toHaveLength(2);
    expect(paginationResult.organization?.groups.pageInfo.hasNextPage).toEqual(true);
    expect(paginationResult.organization?.groups.edges.map(edge => edge.node.name)).toEqual([
      'Test Group C',
      'Test Group B',
    ]);

    invariant(!!paginationResult.organization?.groups.pageInfo.endCursor, 'end cursor must exist');

    paginationResult = await getPaginatedGroupsForOrganization(
      owner.ownerToken,
      org.organization.id,
      2,
      paginationResult.organization.groups.pageInfo.endCursor,
    ).then(r => r.expectNoGraphQLErrors());
    expect(paginationResult.organization?.groups.edges).toHaveLength(1);
    expect(paginationResult.organization?.groups.pageInfo.hasNextPage).toEqual(false);
    expect(paginationResult.organization?.groups.edges.map(edge => edge.node.name)).toEqual([
      'Test Group A',
    ]);
  });
});

test.describe('Mutation.addGroupMappingToGroup', () => {
  test.concurrent(
    'add group mapping to non-existing group yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const readOnlyRole = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!readOnlyRole.createMemberRole.ok?.createdMemberRole,
        'member role creating should have succeeded',
      );

      const roleId = readOnlyRole.createMemberRole.ok.createdMemberRole.id;

      const result = await addGroupMappingToGroup(
        {
          groupId: crypto.randomUUID(),
          roleId,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result.addGroupMappingToGroup).toEqual({
        ok: null,
        error: {
          message: 'Group not found.',
        },
      });
    },
  );
  test.concurrent(
    'add group mapping (non-uuid) to non-existing group yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const readOnlyRole = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!readOnlyRole.createMemberRole.ok?.createdMemberRole,
        'member role creating should have succeeded',
      );

      const roleId = readOnlyRole.createMemberRole.ok.createdMemberRole.id;

      const result = await addGroupMappingToGroup(
        {
          groupId: 'toyota',
          roleId,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result.addGroupMappingToGroup).toEqual({
        ok: null,
        error: {
          message: 'Group not found.',
        },
      });
    },
  );
  test.concurrent(
    'add non-existing role to existing group yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();

      // create group directly via database store;
      // to avoid SCIM setup etc.
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');
      const result = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: crypto.randomUUID(),
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result.addGroupMappingToGroup).toEqual({
        ok: null,
        error: {
          message: 'Role not found.',
        },
      });
    },
  );
  test.concurrent(
    'add non-existing role (non-uuid) to existing group yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();

      // create group directly via database store;
      // to avoid SCIM setup etc.
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');
      const result = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: 'toyota',
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result.addGroupMappingToGroup).toEqual({
        ok: null,
        error: {
          message: 'Role not found.',
        },
      });
    },
  );
  test.concurrent(
    'add role from other organization to group yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();

      // create group directly via database store;
      // to avoid SCIM setup etc.
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

      const otherOrg = await owner.createOrg();
      const otherOrgRole = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: otherOrg.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!otherOrgRole.createMemberRole.ok?.createdMemberRole.id,
        'Expected creating member role to succeed',
      );

      const result = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: otherOrgRole.createMemberRole.ok.createdMemberRole.id,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result.addGroupMappingToGroup).toEqual({
        ok: null,
        error: {
          message: 'Role not found.',
        },
      });
    },
  );
  test.concurrent('add role from same organization to group succeeds', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    // create group directly via database store;
    // to avoid SCIM setup etc.
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);
    const createGroupResult = await groupStore.createGroup({
      organizationId: org.organization.id,
      displayName: 'Test Group',
      externalId: null,
    });
    invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

    const createRoleResult = await createMemberRole(
      {
        name: 'Foo',
        description: 'Bars',
        organization: { byId: org.organization.id },
        selectedPermissions: [],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
      'Expected creating member role to succeed',
    );

    let result = await addGroupMappingToGroup(
      {
        groupId: createGroupResult.group.id,
        roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: null,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result.addGroupMappingToGroup).toMatchObject({
      ok: {
        group: {
          id: createGroupResult.group.id,
          roleMappings: [
            {
              id: expect.any(String),
              role: {
                id: createRoleResult.createMemberRole.ok.createdMemberRole.id,
                name: 'Foo',
              },
            },
          ],
        },
      },
      error: null,
    });

    // add another one

    const createOtherRoleResult = await createMemberRole(
      {
        name: 'Bars',
        description: 'Foo',
        organization: { byId: org.organization.id },
        selectedPermissions: [],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createOtherRoleResult.createMemberRole.ok?.createdMemberRole.id,
      'Expected creating member role to succeed',
    );

    result = await addGroupMappingToGroup(
      {
        groupId: createGroupResult.group.id,
        roleId: createOtherRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: null,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result.addGroupMappingToGroup).toMatchObject({
      ok: {
        group: {
          id: createGroupResult.group.id,
          roleMappings: [
            {
              id: expect.any(String),
              role: {
                id: createRoleResult.createMemberRole.ok.createdMemberRole.id,
                name: 'Foo',
              },
            },
            {
              id: expect.any(String),
              role: {
                id: createOtherRoleResult.createMemberRole.ok.createdMemberRole.id,
                name: 'Bars',
              },
            },
          ],
        },
      },
      error: null,
    });
  });
});

test.describe('Mutation.updateGroupMapping', () => {
  test.concurrent('update non-existing group mapping yields correct error', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const result = await updateGroupMapping(
      {
        groupMappingId: crypto.randomUUID(),
        assignedResources: null,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result).toEqual({
      updateGroupMapping: {
        error: {
          message: 'Could not find group mapping.',
        },
        ok: null,
      },
    });
  });
  test.concurrent(
    'update non existing group mapping (non-uuid) yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const result = await updateGroupMapping(
        {
          groupMappingId: 'toyota',
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        updateGroupMapping: {
          error: {
            message: 'Could not find group mapping.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent(
    'update group mapping from different org without access yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const foreignOwner = await seed.createOwner();

      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

      const createRoleResult = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
        'Expected creating member role to succeed',
      );

      const createGroupMappingResult = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createGroupMappingResult.addGroupMappingToGroup.ok,
        'expected group mapping creation to succeed',
      );

      const groupMappingId =
        createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

      const result = await updateGroupMapping(
        {
          groupMappingId: groupMappingId,
          assignedResources: null,
        },
        foreignOwner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        updateGroupMapping: {
          error: {
            message: 'Could not find group mapping.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent(
    'update group mapping to non-existing role yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

      const createRoleResult = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
        'Expected creating member role to succeed',
      );

      const createGroupMappingResult = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createGroupMappingResult.addGroupMappingToGroup.ok,
        'expected group mapping creation to succeed',
      );

      const groupMappingId =
        createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

      const result = await updateGroupMapping(
        {
          groupMappingId: groupMappingId,
          assignedResources: null,
          roleId: crypto.randomUUID(),
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        updateGroupMapping: {
          error: {
            message: 'Could not find role.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent(
    'update group mapping to non-existing role (non-uuid) yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

      const createRoleResult = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
        'Expected creating member role to succeed',
      );

      const createGroupMappingResult = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createGroupMappingResult.addGroupMappingToGroup.ok,
        'expected group mapping creation to succeed',
      );

      const groupMappingId =
        createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

      const result = await updateGroupMapping(
        {
          groupMappingId: groupMappingId,
          assignedResources: null,
          roleId: 'toyota',
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        updateGroupMapping: {
          error: {
            message: 'Could not find role.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent('update group mapping in same org succeeds', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);
    const createGroupResult = await groupStore.createGroup({
      organizationId: org.organization.id,
      displayName: 'Test Group',
      externalId: null,
    });
    invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

    const createInitialRoleResult = await createMemberRole(
      {
        name: 'Foo',
        description: 'Bars',
        organization: { byId: org.organization.id },
        selectedPermissions: [],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createInitialRoleResult.createMemberRole.ok?.createdMemberRole.id,
      'Expected creating member role to succeed',
    );

    const createGroupMappingResult = await addGroupMappingToGroup(
      {
        groupId: createGroupResult.group.id,
        roleId: createInitialRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: null,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createGroupMappingResult.addGroupMappingToGroup.ok,
      'expected group mapping creation to succeed',
    );

    const createNewRoleResult = await createMemberRole(
      {
        name: 'Bars',
        description: 'Foo',
        organization: { byId: org.organization.id },
        selectedPermissions: [],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createNewRoleResult.createMemberRole.ok?.createdMemberRole.id,
      'Expected creating member role to succeed',
    );

    const groupMappingId =
      createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

    const result = await updateGroupMapping(
      {
        groupMappingId: groupMappingId,
        assignedResources: null,
        roleId: createNewRoleResult.createMemberRole.ok.createdMemberRole.id,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result).toEqual({
      updateGroupMapping: {
        error: null,
        ok: {
          group: {
            id: createGroupResult.group.id,
            roleMappings: [
              {
                id: groupMappingId,
                role: {
                  id: createNewRoleResult.createMemberRole.ok.createdMemberRole.id,
                  name: 'Bars',
                },
              },
            ],
          },
        },
      },
    });
  });
});

test.describe('Mutation.removeGroupMapping', () => {
  test.concurrent('remove non-existing group mapping yields correct error', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const result = await removeGroupMapping(
      {
        groupMappingId: crypto.randomUUID(),
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result).toEqual({
      removeGroupMapping: {
        error: {
          message: 'Group mapping not found.',
        },
        ok: null,
      },
    });
  });
  test.concurrent(
    'remove non-existing group mapping (non-uuid) yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const owner = await seed.createOwner();
      const result = await removeGroupMapping(
        {
          groupMappingId: 'toyota',
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        removeGroupMapping: {
          error: {
            message: 'Group mapping not found.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent(
    'remove group mapping from organization without access yields correct error',
    async ({ expect }) => {
      const seed = initSeed();
      const foreignOwner = await seed.createOwner();

      const owner = await seed.createOwner();
      const org = await owner.createOrg();
      const { pool } = await seed.createDbConnection();
      const groupStore = new GroupStore(new NoopLogger(), pool);
      const createGroupResult = await groupStore.createGroup({
        organizationId: org.organization.id,
        displayName: 'Test Group',
        externalId: null,
      });
      invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

      const createRoleResult = await createMemberRole(
        {
          name: 'Foo',
          description: 'Bars',
          organization: { byId: org.organization.id },
          selectedPermissions: [],
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
        'Expected creating member role to succeed',
      );

      const createGroupMappingResult = await addGroupMappingToGroup(
        {
          groupId: createGroupResult.group.id,
          roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
          assignedResources: null,
        },
        owner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());

      invariant(
        !!createGroupMappingResult.addGroupMappingToGroup.ok,
        'expected group mapping creation to succeed',
      );

      const groupMappingId =
        createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

      const result = await removeGroupMapping(
        {
          groupMappingId: groupMappingId,
        },
        foreignOwner.ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(result).toEqual({
        removeGroupMapping: {
          error: {
            message: 'Group mapping not found.',
          },
          ok: null,
        },
      });
    },
  );
  test.concurrent('remove group mapping from same organization succeeds', async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const { pool } = await seed.createDbConnection();
    const groupStore = new GroupStore(new NoopLogger(), pool);
    const createGroupResult = await groupStore.createGroup({
      organizationId: org.organization.id,
      displayName: 'Test Group',
      externalId: null,
    });
    invariant(createGroupResult.type === 'success', 'Expected creating group to succeed');

    const createRoleResult = await createMemberRole(
      {
        name: 'Foo',
        description: 'Bars',
        organization: { byId: org.organization.id },
        selectedPermissions: [],
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createRoleResult.createMemberRole.ok?.createdMemberRole.id,
      'Expected creating member role to succeed',
    );

    const createGroupMappingResult = await addGroupMappingToGroup(
      {
        groupId: createGroupResult.group.id,
        roleId: createRoleResult.createMemberRole.ok.createdMemberRole.id,
        assignedResources: null,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    invariant(
      !!createGroupMappingResult.addGroupMappingToGroup.ok,
      'expected group mapping creation to succeed',
    );

    const groupMappingId =
      createGroupMappingResult.addGroupMappingToGroup.ok.group.roleMappings[0].id;

    const result = await removeGroupMapping(
      {
        groupMappingId: groupMappingId,
      },
      owner.ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(result).toEqual({
      removeGroupMapping: {
        error: null,
        ok: {
          group: {
            id: createGroupResult.group.id,
            roleMappings: [],
          },
        },
      },
    });
  });
});
