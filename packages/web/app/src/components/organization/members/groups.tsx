import { useState } from 'react';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { useClient, useMutation, useQuery } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { graphql, useFragment, type FragmentType } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { cn } from '@/lib/utils';
import { ReactNode } from '@tanstack/react-router';
import { ManageGroupMappingSheet } from './groups/manage-group-mapping-sheet';

const Groups_OrganizationFragment = graphql(`
  fragment Groups_OrganizationFragment on Organization {
    id
  }
`);

const Groups_OrganizationGroupQuery = graphql(`
  query Groups_OrganizationGroupQuery($organizationId: ID!, $first: Int, $after: String) {
    organization(reference: { byId: $organizationId }) {
      id
      groups(first: $first, after: $after) {
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

export function Groups(props: {
  organization: FragmentType<typeof Groups_OrganizationFragment>;
}): React.ReactElement | null {
  const oorganization = useFragment(Groups_OrganizationFragment, props.organization);
  const client = useClient();
  const [query] = useQuery({
    query: Groups_OrganizationGroupQuery,
    requestPolicy: 'network-only',
    variables: {
      organizationId: oorganization.id,
    },
  });
  const [searchValue, setSearchValue] = useSearchParamsFilter<string>('search', '');
  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, 300);

  const organization = query.data?.organization ?? null;

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Groups"
        description="Manage group to role and resource mappings."
      >
        <div className="flex flex-row gap-4">
          <Input
            className="w-[220px] grow cursor-text"
            placeholder="Search by group name"
            onChange={handleSearchChange}
            defaultValue={searchValue}
          />
        </div>
      </SubPageLayoutHeader>
      <div className="border-border mt-4 overflow-hidden rounded-lg border">
        <div className="bg-neutral-3 border-border text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-4 border-b px-4 py-3 text-sm font-medium">
          <div>Group</div>
          <div className="w-24 text-center">Members</div>
          <div className="w-10" />
        </div>
        <div className="divide-border divide-y">
          {!organization ? (
            <>Loading...</>
          ) : organization.groups.edges.length === 0 ? (
            <div>No data</div>
          ) : (
            organization.groups.edges.map(edge => (
              <GroupRow key={edge.node.id} group={edge.node} organization={organization} />
            ))
          )}
        </div>
      </div>

      <div className="border-border bg-secondary/10 px-4 py-3">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground w-full"
          onClick={() =>
            !!organization?.groups.pageInfo.hasNextPage &&
            void client.query(Groups_OrganizationGroupQuery, {
              organizationId: organization.id,
              after: organization.groups.pageInfo.endCursor,
            })
          }
          disabled={!organization?.groups.pageInfo.hasNextPage}
        >
          Load more
        </Button>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
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
    disabledAt
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
  const isDisabled = !!group.disabledAt;
  const [isExpanded, setIsExpanded] = useState(false);

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
  const [deleteRoleAssignmentState, deleteRoleAssignment] = useMutation(
    GroupRow_RemoveGroupMappingMutation,
  );

  const groupDetailed = query.data?.organization?.group ?? null;

  const [sheetNode, setSheetNode] = useState(null as ReactNode | null);

  return (
    <div className={cn('bg-background', isDisabled && 'opacity-75')}>
      <div
        className={cn(
          'grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 transition-colors',
          isDisabled ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-secondary/20',
        )}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <button
            className="hover:bg-secondary rounded-sm p-0.5 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronRightIcon className="text-muted-foreground h-4 w-4" />
            )}
          </button>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              isDisabled ? 'bg-red-900' : 'bg-neutral-4',
            )}
          >
            {isDisabled ? (
              <AlertTriangleIcon className="text-destructive h-4 w-4" />
            ) : (
              <UsersIcon className="text-muted-foreground h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  isDisabled ? 'text-muted-foreground line-through' : 'text-foreground',
                )}
              >
                {group.name}
              </span>
              {isDisabled && (
                <Badge variant="destructive" className="text-xs font-normal">
                  Disabled
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-normal">
                {group.roleMappingCount === 0 ? (
                  <>No mappings configured</>
                ) : (
                  <>
                    {group.roleMappingCount} {group.roleMappingCount === 1 ? 'mapping' : 'mappings'}
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div className="w-24 text-center">
          <span className="text-sm">{group.memberCount}</span>
        </div>

        <div className="w-8" />
      </div>

      {isExpanded && (
        <>
          {groupDetailed ? (
            <div className="border-border bg-secondary/10 border-t">
              <div className="px-4 py-2 pl-16">
                <div className="mb-2 text-xs font-medium">Role Mappings</div>
                <div className="space-y-2">
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
                          <AlertDialog open onOpenChange={() => setSheetNode(null)}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure you want to delete this mapping?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action can not be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setSheetNode(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={e => {
                                      e.stopPropagation();
                                      deleteRoleAssignment({
                                        input: {
                                          groupId: group.id,
                                          groupMappingId: groupRoleMapping.id,
                                        },
                                      });
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>,
                        );
                      }}
                    />
                  ))}
                  <button
                    className="flex items-center gap-1.5 py-1 text-xs text-amber-500 transition-colors hover:text-amber-400"
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
                    <PlusIcon className="h-3 w-3" />
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
    <div className="bg-neutral-3 group flex items-center justify-between rounded-md px-3 py-1.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              groupRoleMapping.resourceAssignment.mode ===
              GraphQLSchema.ResourceAssignmentModeType.All
                ? 'default'
                : 'secondary'
            }
            className={cn(
              'text-xs font-medium',
              'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30',
            )}
          >
            {groupRoleMapping.role.name}
          </Badge>
          <span className="text-muted-foreground text-xs">on</span>
          <span className="text-foreground text-sm">
            {groupRoleMapping.resourceAssignment.mode ===
            GraphQLSchema.ResourceAssignmentModeType.All ? (
              'all resources'
            ) : (
              <>{groupRoleMapping.resourceAssignment.projects?.length} projects</>
            )}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={props.onClickEdit}>
                <PencilIcon className="text-muted-foreground h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit mapping</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-destructive h-6 w-6"
                onClick={props.onClickDelete}
              >
                <Trash2Icon className="text-muted-foreground h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove mapping</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
