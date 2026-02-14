import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate } from 'date-fns';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Lock,
  MoreVertical,
  Users,
} from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { NestedFilterDropdown } from '@/components/base/nested-filter-dropdown/nested-filter-dropdown';
import type { FilterItem, FilterSelection } from '@/components/base/nested-filter-dropdown/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { graphql } from '@/gql';
import { SavedFilterVisibilityType } from '@/gql/graphql';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Link } from '@tanstack/react-router';

const ManageFilters_SavedFiltersQuery = graphql(`
  query ManageFilters_SavedFiltersQuery($selector: TargetSelectorInput!) {
    target(reference: { bySelector: $selector }) {
      id
      savedFilters(type: INSIGHTS, first: 50) {
        edges {
          cursor
          node {
            id
            name
            description
            visibility
            viewsCount
            createdAt
            updatedAt
            filters {
              operationHashes
              clientFilters {
                name
                versions
              }
            }
            createdBy {
              id
              displayName
            }
            viewerCanUpdate
            viewerCanDelete
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      viewerCanCreateSavedFilter
    }
  }
`);

const ManageFilters_DeleteSavedFilterMutation = graphql(`
  mutation ManageFilters_DeleteSavedFilter($input: DeleteSavedFilterInput!) {
    deleteSavedFilter(input: $input) {
      error {
        message
      }
      ok {
        deletedId
      }
    }
  }
`);

const ManageFilters_UpdateSavedFilterMutation = graphql(`
  mutation ManageFilters_UpdateSavedFilter($input: UpdateSavedFilterInput!) {
    updateSavedFilter(input: $input) {
      error {
        message
      }
      ok {
        savedFilter {
          id
          filters {
            operationHashes
            clientFilters {
              name
              versions
            }
          }
        }
      }
    }
  }
`);

type SavedFilterNode = NonNullable<
  ResultOf<typeof ManageFilters_SavedFiltersQuery>['target']
>['savedFilters']['edges'][number]['node'];

function SavedFilterRow({
  filter,
  expanded,
  onToggleExpand,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  filter: SavedFilterNode;
  expanded: boolean;
  onToggleExpand: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [, deleteSavedFilter] = useMutation(ManageFilters_DeleteSavedFilterMutation);

  const handleDelete = useCallback(() => {
    void deleteSavedFilter({
      input: {
        target: {
          bySelector: {
            organizationSlug,
            projectSlug,
            targetSlug,
          },
        },
        id: filter.id,
      },
    });
  }, [deleteSavedFilter, filter.id, organizationSlug, projectSlug, targetSlug]);

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggleExpand}>
        <TableCell className="w-8">
          <ChevronIcon className="text-neutral-10 size-4" />
        </TableCell>
        <TableCell className="font-medium">{filter.name}</TableCell>
        <TableCell>{filter.viewsCount.toLocaleString()}</TableCell>
        <TableCell>{formatDate(filter.createdAt, 'MMM d, yyyy')}</TableCell>
        <TableCell>{formatDate(filter.updatedAt, 'MMM d, yyyy')}</TableCell>
        <TableCell>
          <span className="flex items-center gap-1.5">
            {filter.visibility === SavedFilterVisibilityType.Shared ? (
              <>
                <Users className="text-neutral-10 size-4" />
                Shared
              </>
            ) : (
              <>
                <Lock className="text-neutral-10 size-4" />
                Private
              </>
            )}
          </span>
        </TableCell>
        <TableCell
          className="w-12 text-right"
          onClick={e => {
            e.stopPropagation();
          }}
        >
          {filter.viewerCanDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="data-[state=open]:bg-neutral-3 flex size-8 p-0"
                >
                  <MoreVertical className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onSelect={handleDelete}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-neutral-2 px-10 py-4">
            <SavedFilterRowFilters
              filter={filter}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              targetSlug={targetSlug}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SavedFilterRowFilters({
  filter,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  filter: SavedFilterNode;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { operationHashes, clientFilters } = filter.filters;
  const hasFilters = operationHashes.length > 0 || clientFilters.length > 0;

  // Items for the NestedFilterDropdown (derived from saved filter data)
  const operationItems: FilterItem[] = useMemo(
    () => operationHashes.map(hash => ({ name: hash, values: [] })),
    [operationHashes],
  );
  const clientItems: FilterItem[] = useMemo(
    () => clientFilters.map(c => ({ name: c.name, values: c.versions ?? [] })),
    [clientFilters],
  );

  // Compute the "saved" selections (what's persisted in the database)
  const savedOperationSelections = useMemo<FilterSelection[]>(
    () => operationHashes.map(hash => ({ name: hash, values: null })),
    [operationHashes],
  );
  const savedClientSelections = useMemo<FilterSelection[]>(
    () =>
      clientFilters.map(c => ({
        name: c.name,
        values: c.versions?.length ? [...c.versions] : null,
      })),
    [clientFilters],
  );

  // Mutable selections (initialized from saved data)
  const [operationSelections, setOperationSelections] =
    useState<FilterSelection[]>(savedOperationSelections);
  const [clientSelections, setClientSelections] =
    useState<FilterSelection[]>(savedClientSelections);
  const [showOperationFilter, setShowOperationFilter] = useState(operationHashes.length > 0);
  const [showClientFilter, setShowClientFilter] = useState(clientFilters.length > 0);

  // Sync state when saved filter data changes (e.g. after mutation updates cache)
  const filterDataKey = JSON.stringify(filter.filters);
  useEffect(() => {
    setOperationSelections(savedOperationSelections);
    setClientSelections(savedClientSelections);
    setShowOperationFilter(operationHashes.length > 0);
    setShowClientFilter(clientFilters.length > 0);
  }, [filterDataKey]);

  // Detect changes from saved state
  const hasChanges = useMemo(() => {
    const current = JSON.stringify({
      ops: operationSelections,
      clients: clientSelections,
      showOps: showOperationFilter,
      showCli: showClientFilter,
    });
    const saved = JSON.stringify({
      ops: savedOperationSelections,
      clients: savedClientSelections,
      showOps: operationHashes.length > 0,
      showCli: clientFilters.length > 0,
    });
    return current !== saved;
  }, [
    operationSelections,
    clientSelections,
    showOperationFilter,
    showClientFilter,
    savedOperationSelections,
    savedClientSelections,
    operationHashes,
    clientFilters,
  ]);

  // Cancel → reset to saved state
  const handleCancel = useCallback(() => {
    setOperationSelections(savedOperationSelections);
    setClientSelections(savedClientSelections);
    setShowOperationFilter(operationHashes.length > 0);
    setShowClientFilter(clientFilters.length > 0);
  }, [savedOperationSelections, savedClientSelections, operationHashes, clientFilters]);

  // Update mutation
  const [updateResult, updateSavedFilter] = useMutation(ManageFilters_UpdateSavedFilterMutation);

  const handleSave = useCallback(async () => {
    const newOperationHashes = showOperationFilter
      ? operationSelections.map(s => s.name)
      : [];

    const newClientFilters = showClientFilter
      ? clientSelections.map(s => ({
          name: s.name,
          versions:
            s.values === null
              ? (clientItems.find(i => i.name === s.name)?.values ?? [])
              : s.values,
        }))
      : [];

    await updateSavedFilter({
      input: {
        id: filter.id,
        target: {
          bySelector: { organizationSlug, projectSlug, targetSlug },
        },
        insightsFilter: {
          operationHashes: newOperationHashes,
          clientFilters: newClientFilters,
        },
      },
    });
  }, [
    showOperationFilter,
    showClientFilter,
    operationSelections,
    clientSelections,
    clientItems,
    filter.id,
    organizationSlug,
    projectSlug,
    targetSlug,
    updateSavedFilter,
  ]);

  if (!hasFilters) {
    return <p className="text-neutral-10 text-sm">No filters configured.</p>;
  }

  return (
    <div>
      <p className="text-neutral-10 mb-2 text-xs font-medium uppercase tracking-wide">Filters</p>
      <div className="flex flex-wrap gap-2">
        {showOperationFilter && operationItems.length > 0 && (
          <NestedFilterDropdown
            label="Operation"
            items={operationItems}
            value={operationSelections}
            onChange={setOperationSelections}
            onRemove={() => {
              setShowOperationFilter(false);
              setOperationSelections([]);
            }}
          />
        )}
        {showClientFilter && clientItems.length > 0 && (
          <NestedFilterDropdown
            label="Client"
            items={clientItems}
            value={clientSelections}
            onChange={setClientSelections}
            onRemove={() => {
              setShowClientFilter(false);
              setClientSelections([]);
            }}
            valuesLabel="versions"
          />
        )}
      </div>
      {filter.viewerCanUpdate && (
        <div className="mt-3 flex gap-2">
          <Button
            variant={hasChanges ? 'primary' : 'default'}
            size="sm"
            onClick={handleSave}
            disabled={updateResult.fetching || !hasChanges}
          >
            Save changes
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleCancel}
            disabled={updateResult.fetching || !hasChanges}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function ManageFiltersContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [query] = useQuery({
    query: ManageFilters_SavedFiltersQuery,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
    },
  });

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const edges = query.data?.target?.savedFilters.edges ?? [];

  const stats = useMemo(() => {
    const filters = edges.map(e => e.node);
    return {
      total: filters.length,
      shared: filters.filter(f => f.visibility === SavedFilterVisibilityType.Shared).length,
      totalViews: filters.reduce((sum, f) => sum + f.viewsCount, 0),
    };
  }, [edges]);

  if (!query.fetching && edges.length === 0) {
    return (
      <div className="py-8">
        <EmptyList
          title="No saved filters"
          description="You haven't created any saved filters yet. Create filters from the Insights page to save and share them."
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Total Filters" value={stats.total} />
        <StatCard label="Shared Filters" value={stats.shared} />
        <StatCard label="Total Views" value={stats.totalViews} />
      </div>

      <div className="mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {edges.map(edge => (
              <SavedFilterRow
                key={edge.node.id}
                filter={edge.node}
                expanded={expandedRows.has(edge.node.id)}
                onToggleExpand={() => toggleRow(edge.node.id)}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-neutral-10 text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

export function TargetInsightsManageFiltersPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  return (
    <>
      <Meta title="Manage saved filters" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
      >
        <div className="py-6">
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/insights"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
            }}
            className="text-neutral-10 hover:text-neutral-12 mb-4 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Insights
          </Link>
          <Title>Manage saved filters</Title>
          <Subtitle>View and manage your saved filter views</Subtitle>
        </div>
        <ManageFiltersContent {...props} />
      </TargetLayout>
    </>
  );
}
