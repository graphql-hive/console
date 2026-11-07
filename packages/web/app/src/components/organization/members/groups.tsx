import { useState, type ReactNode } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { useClient, useMutation, useQuery } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Button } from '@/components/ui/primitives/button/button';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Input } from '@/components/ui/primitives/input/input';
import { AlertDialog } from '@/components/ui/primitives/overlays/alert-dialog/alert-dialog';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { graphql, useFragment, type FragmentType } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { ManageGroupMappingSheet } from './groups/manage-group-mapping-sheet';
import * as styles from './groups.css';

// By slug, so the route loader can start it from the URL alone.
export const Groups_OrganizationGroupQuery = graphql(`
  query Groups_OrganizationGroupQuery(
    $organizationSlug: String!
    $first: Int
    $after: String
    $searchTerm: String
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      groups(first: $first, after: $after, filters: { searchTerm: $searchTerm }) {
        edges {
          node {
            id
            ...GroupRow_GroupFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
      ...GroupRow_OrganizationFragment
    }
  }
`);

export function groupsVariables(
  organizationSlug: string,
  searchTerm: string | null,
  after: string | null,
) {
  return { organizationSlug, searchTerm, after };
}

export function Groups(): React.ReactElement | null {
  const { organizationSlug } = useSlugs('organization');
  const client = useClient();
  const [searchValue, setSearchValue] = useSearchParamsFilter<string>('search', '');
  // A page loaded by "Load more" merges into this list (Organization.groups in urql-cache.ts).
  const [query] = useQuery({
    query: Groups_OrganizationGroupQuery,
    variables: groupsVariables(organizationSlug, searchValue || null, null),
  });
  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, 300);

  const organization = query.data?.organization ?? null;

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Groups"
        description="Manage group to role and resource mappings."
        sideContent={
          <div className={styles.groupsDiv}>
            <Input
              placeholder="Search by group name"
              leadingIcon={SearchIcon}
              onChange={handleSearchChange}
              defaultValue={searchValue}
            />
          </div>
        }
      />
      <div className={styles.groupsDiv2}>
        <div className={styles.groupsDiv3}>
          <div>Group</div>
          <div className={styles.groupsDiv4}>Members</div>
          <div className={styles.groupsDiv5} />
        </div>
        <div className={styles.groupsDiv6}>
          {!organization ? (
            <div role="status" aria-label="Loading groups" className={styles.groupsDiv7}>
              <span className={shared.srOnly}>Loading groups</span>
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className={styles.groupsDiv8}>
                  <div className={shared.row.gap3}>
                    <span className={styles.groupsSpan2}>
                      <Skeleton variants={{ shape: 'block' }} />
                    </span>
                    <Skeleton variants={{ shape: 'circle' }} />
                    <div className={shared.row.gap2}>
                      <span className={styles.groupsSpan3}>
                        <Skeleton variants={{ width: 'full' }} />
                      </span>
                      <span className={styles.groupsSpan4}>
                        <Skeleton variants={{ size: 'lg', width: 'full' }} />
                      </span>
                    </div>
                  </div>
                  <div className={styles.groupsDiv11}>
                    <span className={styles.groupsSpan5}>
                      <Skeleton variants={{ width: 'full' }} />
                    </span>
                  </div>
                  <div className={styles.groupsDiv12} />
                </div>
              ))}
            </div>
          ) : organization.groups.edges.length === 0 ? (
            <div className={styles.groupsDiv13}>
              <h3 className={styles.groupsH3}>No groups synced yet</h3>
              <p className={styles.groupsP}>
                Groups will appear here after they are provisioned from your identity provider via
                SCIM. Once synced, you can map them to roles and resources.
              </p>
            </div>
          ) : (
            organization.groups.edges.map(edge => (
              <GroupRow key={edge.node.id} group={edge.node} organization={organization} />
            ))
          )}
        </div>
      </div>

      <div className={styles.groupsDiv14}>
        <Button
          variant="ghost"
          width="full"
          onClick={() => {
            const endCursor = organization?.groups.pageInfo.endCursor;
            if (organization?.groups.pageInfo.hasNextPage && endCursor) {
              void client
                .query(
                  Groups_OrganizationGroupQuery,
                  groupsVariables(organizationSlug, searchValue || null, endCursor),
                )
                .toPromise();
            }
          }}
          disabled={!organization?.groups.pageInfo.hasNextPage}
        >
          Load more
        </Button>
      </div>

      <p className={styles.groupsP2}>
        Groups are synced from your identity provider via SCIM. Role assignments configured here
        determine what permissions group members receive.
      </p>
    </SubPageLayout>
  );
}

const GroupRow_GroupFragment = graphql(`
  fragment GroupRow_GroupFragment on Group {
    id
    name
    memberCount
    roleMappingCount
    ...ManageGroupMapping_GroupFragment
  }
`);

const GroupRowQuery = graphql(`
  query GroupRowQuery($organizationId: ID!, $groupId: ID!) {
    organization(reference: { byId: $organizationId }) {
      id
      group(id: $groupId) {
        id
        roleMappings {
          id
          ...GroupRoleMappingRow_GroupRoleMappingFragment
          ...ManageGroupMappingSheet_ExistingGroupRoleMappingFragment
        }
        ...GroupRow_GroupFragment
      }
    }
  }
`);

const GroupRow_RemoveGroupMappingMutation = graphql(`
  mutation GroupRow_RemoveGroupMappingMutation($input: RemoveGroupMappingInput!) {
    removeGroupMapping(input: $input) {
      error {
        message
      }
      ok {
        group {
          id
          ...GroupRow_GroupFragment
          roleMappings {
            id
          }
        }
      }
    }
  }
`);

const GroupRow_OrganizationFragment = graphql(`
  fragment GroupRow_OrganizationFragment on Organization {
    id
    ...ManageGroupMapping_OrganizationFragment
  }
`);

type GroupRowProps = {
  organization: FragmentType<typeof GroupRow_OrganizationFragment>;
  group: FragmentType<typeof GroupRow_GroupFragment>;
};

function GroupRow(props: GroupRowProps): ReactNode {
  const group = useFragment(GroupRow_GroupFragment, props.group);
  const organization = useFragment(GroupRow_OrganizationFragment, props.organization);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  function onToggleExpand() {
    setIsExpanded(value => !value);
  }

  const [query] = useQuery({
    query: GroupRowQuery,
    variables: {
      organizationId: organization.id,
      groupId: group.id,
    },
    requestPolicy: 'network-only',
    pause: isExpanded === false,
  });
  const [, deleteRoleAssignment] = useMutation(GroupRow_RemoveGroupMappingMutation);

  const groupDetailed = query.data?.organization?.group ?? null;

  const [sheetNode, setSheetNode] = useState(null as ReactNode | null);

  return (
    <div>
      <div className={cn(styles.groupRowDiv)} onClick={onToggleExpand}>
        <div className={shared.row.gap3}>
          <button
            className={styles.groupRowButton}
            onClick={e => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className={styles.groupRowChevronDownIcon} />
            ) : (
              <ChevronRightIcon className={styles.groupRowChevronRightIcon} />
            )}
          </button>
          <div className={cn(styles.groupRowDiv3)}>
            <UsersIcon className={styles.groupRowUsersIcon} />
          </div>
          <div className={shared.fillShrinkable}>
            <div className={shared.row.gap2}>
              <span className={cn(styles.groupRowSpan)}>{group.name}</span>
              <Badge
                variants={{ variant: 'outline' }}
                content={
                  group.roleMappingCount === 0
                    ? 'No mappings configured'
                    : `${group.roleMappingCount} ${group.roleMappingCount === 1 ? 'mapping' : 'mappings'}`
                }
              />
            </div>
          </div>
        </div>

        <div className={styles.groupRowDiv6}>
          <span className={shared.text.sm}>{group.memberCount}</span>
        </div>

        <div className={styles.groupRowDiv7} />
      </div>

      {isExpanded && (
        <>
          {groupDetailed ? (
            <div className={styles.groupRowDiv8}>
              <div className={styles.groupRowDiv9}>
                <div className={styles.groupRowDiv10}>Role Mappings</div>
                <div className={styles.groupRowDiv11}>
                  {groupDetailed.roleMappings.map(groupRoleMapping => (
                    <GroupRoleMappingRow
                      key={groupRoleMapping.id}
                      groupRoleMapping={groupRoleMapping}
                      onClickEdit={() => {
                        setSheetNode(
                          <ManageGroupMappingSheet
                            group={group}
                            organization={organization}
                            existingGroupRoleMapping={groupRoleMapping}
                            close={() => setSheetNode(null)}
                          />,
                        );
                      }}
                      onClickDelete={() => {
                        setSheetNode(
                          <AlertDialog
                            open
                            onOpenChange={() => setSheetNode(null)}
                            title="Are you sure you want to delete this mapping?"
                            description="This action can not be undone."
                            confirm={{
                              label: 'Delete',
                              variant: 'destructive',
                              onClick: async () => {
                                setSheetNode(null);
                                try {
                                  const result = await deleteRoleAssignment({
                                    input: {
                                      groupMappingId: groupRoleMapping.id,
                                    },
                                  });
                                  if (result.error) {
                                    toast({
                                      variant: 'destructive',
                                      title: 'Failed to remove role assignment',
                                      description: result.error.message,
                                    });
                                  } else if (result.data?.removeGroupMapping.ok) {
                                    toast({
                                      title: 'Role assignment removed',
                                      description: 'The role assignment was removed from the group',
                                    });
                                  } else if (result.data?.removeGroupMapping.error) {
                                    toast({
                                      title: 'Failed to remove role assignment',
                                      description: result.data.removeGroupMapping.error.message,
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Failed to delete a member',
                                    description: String(error),
                                  });
                                }
                              },
                            }}
                          />,
                        );
                      }}
                    />
                  ))}
                  <button
                    className={styles.groupRowButton2}
                    onClick={() =>
                      setSheetNode(
                        <ManageGroupMappingSheet
                          group={group}
                          organization={organization}
                          existingGroupRoleMapping={null}
                          close={() => setSheetNode(null)}
                        />,
                      )
                    }
                  >
                    <PlusIcon className={styles.groupRowPlusIcon} />
                    Add role mapping
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
      {sheetNode}
    </div>
  );
}

const GroupRoleMappingRow_GroupRoleMappingFragment = graphql(`
  fragment GroupRoleMappingRow_GroupRoleMappingFragment on GroupRoleMapping {
    id
    role {
      id
      name
    }
    resourceAssignment {
      mode
      projects {
        projectId
      }
    }
  }
`);

function GroupRoleMappingRow(props: {
  groupRoleMapping: FragmentType<typeof GroupRoleMappingRow_GroupRoleMappingFragment>;
  onClickEdit: () => void;
  onClickDelete: () => void;
}) {
  const groupRoleMapping = useFragment(
    GroupRoleMappingRow_GroupRoleMappingFragment,
    props.groupRoleMapping,
  );

  return (
    <div className={cn(styles.groupRoleMappingRowDiv, 'group')}>
      <div className={shared.row.gap3}>
        <div className={shared.row.gap2}>
          <Badge content={groupRoleMapping.role.name} />
          <span className={shared.text.xs}>on</span>
          <span className={shared.text.sm}>
            {groupRoleMapping.resourceAssignment.mode ===
            GraphQLSchema.ResourceAssignmentModeType.All ? (
              'all resources'
            ) : (
              <>
                {groupRoleMapping.resourceAssignment.projects?.length ?? 0} project
                {(groupRoleMapping.resourceAssignment.projects?.length ?? 0) === 1 ? '' : 's'}
              </>
            )}
          </span>
        </div>
      </div>
      <div className={styles.groupRoleMappingRowDiv4}>
        <Tooltip
          trigger={
            <Button variant="ghost" size="icon-sm" onClick={props.onClickEdit}>
              <PencilIcon className={styles.groupRoleMappingRowPencilIcon} />
            </Button>
          }
          content="Edit mapping"
        />
        <Tooltip
          trigger={
            <Button variant="ghost" size="icon-sm" onClick={props.onClickDelete}>
              <Trash2Icon className={styles.groupRoleMappingRowTrash2Icon} />
            </Button>
          }
          content="Remove mapping"
        />
      </div>
    </div>
  );
}
