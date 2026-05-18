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
import { useQuery } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { graphql, useFragment, type FragmentType } from '@/gql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { cn } from '@/lib/utils';

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
        }
      }
    }
  }
`);

export function Groups(props: {
  organization: FragmentType<typeof Groups_OrganizationFragment>;
}): React.ReactElement | null {
  const organization = useFragment(Groups_OrganizationFragment, props.organization);
  const [query] = useQuery({
    query: Groups_OrganizationGroupQuery,
    requestPolicy: 'network-only',
    variables: {
      organizationId: organization.id,
    },
  });
  const [searchValue, setSearchValue] = useSearchParamsFilter<string>('search', '');
  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, 300);

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
          <div className="w-10"></div>
        </div>
        <div className="divide-border divide-y">
          {query.data?.organization?.groups?.edges.length === 0 ? (
            <div>No data</div>
          ) : (
            query.data?.organization?.groups?.edges.map(edge => (
              <GroupRow
                key={edge.node.id}
                group={edge.node}
                organizationId={query.data.organization.id}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-border bg-secondary/10 border-t px-4 py-3">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground w-full"
          onClick={() => alert('brrrrt')}
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
  }
`);

const GroupRowQuery = graphql(`
  query GroupRowQuery($organizationId: ID!, $groupId: ID!) {
    organization(reference: { byId: $organizationId }) {
      id
      group(id: $groupId) {
        id

        roleMappings {
          role {
            id
            name
          }
          resourceAssignment {
            mode
            projects {
              project {
                id
              }
            }
          }
        }
        ...GroupRow_GroupFragment
      }
    }
  }
`);

type GroupRowProps = {
  organizationId: string;
  group: FragmentType<typeof GroupRow_GroupFragment>;
};

function GroupRow(props: GroupRowProps) {
  const group = useFragment(GroupRow_GroupFragment, props.group);
  const isDisabled = !!group.disabledAt;
  const [isExpanded, setIsExpanded] = useState(false);

  function onToggleExpand() {
    setIsExpanded(value => !value);
  }

  const [query] = useQuery({
    query: GroupRowQuery,
    variables: {
      organizationId: props.organizationId,
      groupId: group.id,
    },
    requestPolicy: 'network-only',
    pause: isExpanded === false,
  });

  const groupDetailed = query.data?.organization?.group ?? null;

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
            className="hover:bg-secondary rounded p-0.5 transition-colors"
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
                  Deleted
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
                <div className="mb-2 text-xs font-medium uppercase tracking-wider">
                  Role Assignments
                </div>
                <div className="space-y-2">
                  {/*{groupDetailed.roleMappings.map(assignment => (
                    <RoleAssignmentRow key={assignment.id} assignment={assignment} />
                  ))}*/}
                  <button className="flex items-center gap-1.5 py-1 text-xs text-amber-500 transition-colors hover:text-amber-400">
                    <PlusIcon className="h-3 w-3" />
                    Add role mapping
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>Nooop</>
          )}
        </>
      )}
    </div>
  );
}

function RoleAssignmentRow({ assignment }: { assignment: RoleAssignment }) {
  const resourceTypeLabel = {
    all: null,
    project: 'Project',
    target: 'Target',
  };

  return (
    <div className="bg-neutral-3 group flex items-center justify-between rounded-md px-3 py-1.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={assignment.role === 'Admin' ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-medium',
              assignment.role === 'Admin' && 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30',
            )}
          >
            {assignment.role}
          </Badge>
          <span className="text-muted-foreground text-xs">on</span>
          <span className="text-foreground text-sm">{assignment.resource}</span>
          {resourceTypeLabel[assignment.resourceType] && (
            <span className="text-muted-foreground text-xs">
              ({resourceTypeLabel[assignment.resourceType]})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <PencilIcon className="text-muted-foreground h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit mapping</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:text-destructive h-6 w-6">
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

export interface RoleAssignment {
  id: string;
  role: string;
  resource: string;
  resourceType: 'all' | 'project' | 'target';
}

export interface Group {
  id: string;
  name: string;
  memberCount: number;
  roleAssignments: RoleAssignment[];
  createdAt: string;
  disabled?: boolean;
}

const groups: Group[] = [
  {
    id: 'g1',
    name: 'Engineering',
    memberCount: 12,
    roleAssignments: [
      { id: 'ra1', role: 'Contributor', resource: 'All resources', resourceType: 'all' },
      { id: 'ra2', role: 'Viewer', resource: 'Production', resourceType: 'target' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 'g2',
    name: 'Platform Team',
    memberCount: 5,
    roleAssignments: [{ id: 'ra3', role: 'Admin', resource: 'All resources', resourceType: 'all' }],
    createdAt: '2024-02-01',
  },
  {
    id: 'g3',
    name: 'Design',
    memberCount: 4,
    roleAssignments: [
      { id: 'ra4', role: 'Viewer', resource: 'All resources', resourceType: 'all' },
      { id: 'ra5', role: 'Contributor', resource: 'Design System', resourceType: 'project' },
    ],
    createdAt: '2024-01-20',
  },
  {
    id: 'g4',
    name: 'Security',
    memberCount: 3,
    roleAssignments: [
      { id: 'ra6', role: 'Admin', resource: 'All resources', resourceType: 'all' },
      { id: 'ra7', role: 'Admin', resource: 'Audit Logs', resourceType: 'project' },
    ],
    createdAt: '2024-02-10',
  },
  {
    id: 'g5',
    name: 'DevOps',
    memberCount: 6,
    roleAssignments: [
      { id: 'ra8', role: 'Contributor', resource: 'All resources', resourceType: 'all' },
      { id: 'ra9', role: 'Admin', resource: 'Infrastructure', resourceType: 'project' },
      { id: 'ra10', role: 'Admin', resource: 'Production', resourceType: 'target' },
    ],
    createdAt: '2024-01-25',
  },
  {
    id: 'g6',
    name: 'QA Team',
    memberCount: 0,
    roleAssignments: [
      { id: 'ra11', role: 'Viewer', resource: 'All resources', resourceType: 'all' },
      { id: 'ra12', role: 'Contributor', resource: 'Staging', resourceType: 'target' },
    ],
    createdAt: '2024-01-10',
    disabled: true,
  },
];
