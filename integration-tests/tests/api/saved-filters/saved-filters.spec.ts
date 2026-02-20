/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { ProjectType, SavedFilterVisibilityType } from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';

describe('Saved Filters', () => {
  describe('CRUD', () => {
    test.concurrent('create, update and delete a saved filter', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter, updateSavedFilter, deleteSavedFilter, getSavedFilter } =
        await createProject(ProjectType.Single);

      // Create a filter
      const createResult = await createSavedFilter({
        name: 'My Filter',
        description: 'Filter for high-traffic operations',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: {
          operationHashes: ['op1', 'op2'],
          clientFilters: [{ name: 'Hive CLI', versions: ['0.12.1', '0.12.3'] }],
        },
      });

      expect(createResult.error).toBeNull();
      expect(createResult.ok?.savedFilter.id).toBeDefined();
      expect(createResult.ok?.savedFilter.name).toBe('My Filter');
      expect(createResult.ok?.savedFilter.description).toBe('Filter for high-traffic operations');

      expect(createResult.ok?.savedFilter.visibility).toBe('PRIVATE');
      expect(createResult.ok?.savedFilter.viewsCount).toBe(0);
      expect(createResult.ok?.savedFilter.filters.operationHashes).toEqual(['op1', 'op2']);
      expect(createResult.ok?.savedFilter.filters.clientFilters).toEqual([
        { name: 'Hive CLI', versions: ['0.12.1', '0.12.3'] },
      ]);
      expect(createResult.ok?.savedFilter.viewerCanUpdate).toBe(true);
      expect(createResult.ok?.savedFilter.viewerCanDelete).toBe(true);

      const filterId = createResult.ok?.savedFilter.id!;

      // Verify filter can be fetched
      const fetchedFilter = await getSavedFilter({ filterId });
      expect(fetchedFilter?.id).toBe(filterId);
      expect(fetchedFilter?.name).toBe('My Filter');

      // Update the filter
      const updateResult = await updateSavedFilter({
        filterId,
        name: 'Updated Filter Name',
        description: 'Updated description',
        visibility: SavedFilterVisibilityType.Shared,
        insightsFilter: {
          operationHashes: ['op3'],
          clientFilters: [{ name: 'Gateway' }],
        },
      });

      expect(updateResult.error).toBeNull();
      expect(updateResult.ok?.savedFilter.id).toBe(filterId);
      expect(updateResult.ok?.savedFilter.name).toBe('Updated Filter Name');
      expect(updateResult.ok?.savedFilter.description).toBe('Updated description');
      expect(updateResult.ok?.savedFilter.visibility).toBe('SHARED');
      expect(updateResult.ok?.savedFilter.filters.operationHashes).toEqual(['op3']);
      expect(updateResult.ok?.savedFilter.filters.clientFilters).toEqual([
        { name: 'Gateway', versions: null },
      ]);
      expect(updateResult.ok?.savedFilter.updatedBy?.id).toBeDefined();

      // Delete the filter
      const deleteResult = await deleteSavedFilter({ filterId });
      expect(deleteResult.error).toBeNull();
      expect(deleteResult.ok?.deletedId).toBe(filterId);

      // Verify filter is deleted
      const deletedFilter = await getSavedFilter({ filterId });
      expect(deletedFilter).toBeNull();
    });

    test.concurrent('list saved filters with pagination and filtering', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter, getSavedFilters } = await createProject(ProjectType.Single);

      // Create multiple filters
      await createSavedFilter({
        name: 'Private Filter 1',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: { operationHashes: ['op1'] },
      });

      await createSavedFilter({
        name: 'Private Filter 2',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: { operationHashes: ['op2'] },
      });

      await createSavedFilter({
        name: 'Shared Filter 1',

        visibility: SavedFilterVisibilityType.Shared,
        insightsFilter: { operationHashes: ['op3'] },
      });

      // List all filters (private + shared for owner)
      const allFilters = await getSavedFilters({

        first: 10,
      });

      expect(allFilters.savedFilters?.edges.length).toBe(3);
      expect(allFilters.viewerCanCreateSavedFilter).toBe(true);

      // List only private filters
      const privateFilters = await getSavedFilters({

        first: 10,
        visibility: SavedFilterVisibilityType.Private,
      });

      expect(privateFilters.savedFilters?.edges.length).toBe(2);
      expect(privateFilters.savedFilters?.edges.every(e => e.node.visibility === 'PRIVATE')).toBe(
        true,
      );

      // List only shared filters
      const sharedFilters = await getSavedFilters({

        first: 10,
        visibility: SavedFilterVisibilityType.Shared,
      });

      expect(sharedFilters.savedFilters?.edges.length).toBe(1);
      expect(sharedFilters.savedFilters?.edges[0].node.visibility).toBe('SHARED');

      // Search by name
      const searchResults = await getSavedFilters({

        first: 10,
        search: 'Private',
      });

      expect(searchResults.savedFilters?.edges.length).toBe(2);
    });

    test.concurrent('track filter views', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter, trackSavedFilterView, getSavedFilter } = await createProject(
        ProjectType.Single,
      );

      // Create a filter
      const createResult = await createSavedFilter({
        name: 'Trackable Filter',

        visibility: SavedFilterVisibilityType.Shared,
        insightsFilter: { operationHashes: ['op1'] },
      });

      const filterId = createResult.ok?.savedFilter.id!;
      expect(createResult.ok?.savedFilter.viewsCount).toBe(0);

      // Track views
      const trackResult1 = await trackSavedFilterView({ filterId });
      expect(trackResult1.error).toBeNull();
      expect(trackResult1.ok?.savedFilter.viewsCount).toBe(1);

      const trackResult2 = await trackSavedFilterView({ filterId });
      expect(trackResult2.ok?.savedFilter.viewsCount).toBe(2);

      // Verify count persisted
      const filter = await getSavedFilter({ filterId });
      expect(filter?.viewsCount).toBe(2);
    });
  });

  describe('Visibility and Permissions', () => {
    test.concurrent('private filters should only be visible to the creator', async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject, inviteAndJoinMember } = await createOrg();
      const { createSavedFilter, getSavedFilter, getSavedFilters } = await createProject(
        ProjectType.Single,
      );

      // Create a private filter as owner
      const createResult = await createSavedFilter({
        name: 'Owner Private Filter',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: { operationHashes: ['op1'] },
      });

      const filterId = createResult.ok?.savedFilter.id!;

      // Invite and join a member
      const { memberToken } = await inviteAndJoinMember();

      // Owner can see the filter
      const ownerFilter = await getSavedFilter({ filterId, token: ownerToken });
      expect(ownerFilter?.id).toBe(filterId);

      // Member cannot see private filter
      const memberFilter = await getSavedFilter({ filterId, token: memberToken });
      expect(memberFilter).toBeNull();

      // Member cannot see private filter in list
      const memberFilters = await getSavedFilters({

        first: 10,
        token: memberToken,
      });
      expect(memberFilters.savedFilters?.edges.length).toBe(0);
    });

    test.concurrent(
      'shared filters should be visible to all project members',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, inviteAndJoinMember } = await createOrg();
        const { createSavedFilter, getSavedFilter, getSavedFilters } = await createProject(
          ProjectType.Single,
        );

        // Create a shared filter as owner
        const createResult = await createSavedFilter({
          name: 'Shared Filter',
  
          visibility: SavedFilterVisibilityType.Shared,
          insightsFilter: { operationHashes: ['op1'] },
        });

        const filterId = createResult.ok?.savedFilter.id!;

        // Invite and join a member
        const { memberToken } = await inviteAndJoinMember();

        // Member can see the shared filter
        const memberFilter = await getSavedFilter({ filterId, token: memberToken });
        expect(memberFilter?.id).toBe(filterId);
        expect(memberFilter?.name).toBe('Shared Filter');

        // Member can see shared filter in list
        const memberFilters = await getSavedFilters({
  
          first: 10,
          token: memberToken,
        });
        expect(memberFilters.savedFilters?.edges.length).toBe(1);
      },
    );

    test.concurrent(
      'shared filters should be updatable by any project member with sharedSavedFilter:modify permission',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, inviteAndJoinMember } = await createOrg();
        const { createSavedFilter, updateSavedFilter, getSavedFilter } = await createProject(
          ProjectType.Single,
        );

        // Create a shared filter as owner
        const createResult = await createSavedFilter({
          name: 'Shared Filter',
  
          visibility: SavedFilterVisibilityType.Shared,
          insightsFilter: { operationHashes: ['op1'] },
        });

        const filterId = createResult.ok?.savedFilter.id!;

        // First invite a member to get access to createMemberRole
        const { createMemberRole } = await inviteAndJoinMember();

        // Create a role with sharedSavedFilter:modify permission (without project:modifySettings)
        const role = await createMemberRole([
          'organization:describe',
          'project:describe',
          'sharedSavedFilter:modify',
        ]);

        // Invite and join a member with the sharedSavedFilter:modify role
        const { memberToken } = await inviteAndJoinMember({ memberRoleId: role.id });

        // Member can see the filter
        const memberView = await getSavedFilter({ filterId, token: memberToken });
        expect(memberView?.viewerCanUpdate).toBe(true);
        expect(memberView?.viewerCanDelete).toBe(true);

        // Member can update shared filter
        const updateResult = await updateSavedFilter({
          filterId,
          name: 'Updated by Member',
          token: memberToken,
        });

        expect(updateResult.error).toBeNull();
        expect(updateResult.ok?.savedFilter.name).toBe('Updated by Member');
      },
    );

    test.concurrent(
      'private filters can be managed by any project member without sharedSavedFilter:modify',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, inviteAndJoinMember } = await createOrg();
        const { createSavedFilter, updateSavedFilter, deleteSavedFilter } = await createProject(
          ProjectType.Single,
        );

        // First invite a member to get access to createMemberRole
        const { createMemberRole } = await inviteAndJoinMember();

        // Create a role with only project:describe (no sharedSavedFilter:modify)
        const role = await createMemberRole(['organization:describe', 'project:describe']);

        // Invite and join a member with the viewer-like role
        const { memberToken } = await inviteAndJoinMember({ memberRoleId: role.id });

        // Member can create a private filter
        const createResult = await createSavedFilter({
          name: 'My Private Filter',
  
          visibility: SavedFilterVisibilityType.Private,
          insightsFilter: { operationHashes: ['op1'] },
          token: memberToken,
        });

        expect(createResult.error).toBeNull();
        expect(createResult.ok?.savedFilter.name).toBe('My Private Filter');
        expect(createResult.ok?.savedFilter.visibility).toBe('PRIVATE');

        const filterId = createResult.ok?.savedFilter.id!;

        // Member can update their own private filter
        const updateResult = await updateSavedFilter({
          filterId,
          name: 'Updated Private Filter',
          token: memberToken,
        });

        expect(updateResult.error).toBeNull();
        expect(updateResult.ok?.savedFilter.name).toBe('Updated Private Filter');

        // Member can delete their own private filter
        const deleteResult = await deleteSavedFilter({ filterId, token: memberToken });
        expect(deleteResult.error).toBeNull();
        expect(deleteResult.ok?.deletedId).toBe(filterId);
      },
    );

    test.concurrent(
      'create shared filter: failure without sharedSavedFilter:modify permission',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, inviteAndJoinMember } = await createOrg();
        const { createSavedFilter } = await createProject(ProjectType.Single);

        // First invite a member to get access to createMemberRole
        const { createMemberRole } = await inviteAndJoinMember();

        // Create a role with only project:describe (no sharedSavedFilter:modify)
        const role = await createMemberRole(['organization:describe', 'project:describe']);

        // Invite and join a member with the viewer-like role
        const { memberToken } = await inviteAndJoinMember({ memberRoleId: role.id });

        // Try to create a shared filter - should fail
        await expect(
          createSavedFilter({
            name: 'Unauthorized Shared Filter',
    
            visibility: SavedFilterVisibilityType.Shared,
            insightsFilter: { operationHashes: ['op1'] },
            token: memberToken,
          }),
        ).rejects.toEqual(
          expect.objectContaining({
            message: expect.stringContaining(
              `No access (reason: "Missing permission for performing 'sharedSavedFilter:modify' on resource")`,
            ),
          }),
        );
      },
    );
  });

  describe('Validation', () => {
    test.concurrent('create: failure with empty name', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter } = await createProject(ProjectType.Single);

      const result = await createSavedFilter({
        name: '',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: { operationHashes: ['op1'] },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('String must contain at least 1 character');
    });

    test.concurrent('create: failure with name exceeding 100 characters', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter } = await createProject(ProjectType.Single);

      const result = await createSavedFilter({
        name: 'a'.repeat(101),

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: { operationHashes: ['op1'] },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('String must contain at most 100 character');
    });

    test.concurrent('create: failure with too many operations', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createSavedFilter } = await createProject(ProjectType.Single);

      const result = await createSavedFilter({
        name: 'Too many ops',

        visibility: SavedFilterVisibilityType.Private,
        insightsFilter: {
          operationHashes: Array.from({ length: 101 }, (_, i) => `op${i}`),
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Array must contain at most 100 element');
    });

  });
});
