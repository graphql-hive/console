import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, formatISO } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronRight, Lock, MoreVertical, Users } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { FilterDropdown } from '@/components/base/filter-dropdown/filter-dropdown';
import type { FilterItem, FilterSelection } from '@/components/base/filter-dropdown/types';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { availablePresets, DateRangePicker } from '@/components/ui/date-range-picker';
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
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { SavedFilterVisibilityType } from '@/gql/graphql';
import { parse } from '@/lib/date-math';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Link } from '@tanstack/react-router';

export const ManageFilters_SavedFiltersQuery = graphql(`
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
              dateRange {
                from
                to
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

export const ManageFilters_DeleteSavedFilterMutation = graphql(`
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
            dateRange {
              from
              to
            }
          }
        }
      }
    }
  }
`);

const ManageFilters_OperationStatsQuery = graphql(`
  query ManageFilters_OperationStats($selector: TargetSelectorInput!, $period: DateRangeInput!) {
    target(reference: { bySelector: $selector }) {
      id
      operationsStats(period: $period) {
        operations {
          edges {
            node {
              id
              name
              operationHash
            }
          }
        }
        clients {
          edges {
            node {
              name
              versions {
                version
              }
            }
          }
        }
      }
    }
  }
`);

const DEFAULT_DATE_RANGE = { from: 'now-7d', to: 'now' };

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
  const { toast } = useToast();

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
    }).then(result => {
      if (result.error || result.data?.deleteSavedFilter.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error?.message || result.data?.deleteSavedFilter.error?.message,
        });
      } else {
        toast({
          title: 'Filter deleted',
          description: 'The saved filter has been deleted.',
        });
      }
    });
  }, [deleteSavedFilter, filter.id, organizationSlug, projectSlug, targetSlug, toast]);

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
                <Button variant="ghost" className="data-[state=open]:bg-neutral-3 flex size-8 p-0">
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

  // Date range state (relative strings like 'now-7d')
  const savedDateRange = filter.filters.dateRange ?? DEFAULT_DATE_RANGE;
  const [dateRange, setDateRange] = useState(savedDateRange);

  // Resolve relative date range to ISO strings for the operationsStats query
  const resolvedPeriod = useMemo(() => {
    const from = parse(dateRange.from);
    const to = parse(dateRange.to);
    if (from && to) {
      return { from: formatISO(from), to: formatISO(to) };
    }
    const fallbackFrom = parse('now-7d')!;
    const fallbackTo = parse('now')!;
    return { from: formatISO(fallbackFrom), to: formatISO(fallbackTo) };
  }, [dateRange]);

  // Fetch all operations and clients for the date range
  const [opsQuery] = useQuery({
    query: ManageFilters_OperationStatsQuery,
    variables: {
      selector: { organizationSlug, projectSlug, targetSlug },
      period: resolvedPeriod,
    },
  });

  // Build merged operation items (all from stats + any saved hashes not in stats)
  const { allOperationItems, hashToNameMap } = useMemo(() => {
    const map = new Map<string, string>();
    const statsOps = opsQuery.data?.target?.operationsStats?.operations?.edges ?? [];

    for (const edge of statsOps) {
      if (edge.node.operationHash) {
        map.set(edge.node.operationHash, edge.node.name);
      }
    }

    const items: FilterItem[] = statsOps
      .filter(e => e.node.operationHash != null)
      .map(e => ({
        id: e.node.operationHash!,
        name: e.node.name,
        values: [],
      }));

    // Add any saved hashes that aren't in the current stats (fallback: show hash as name)
    for (const hash of operationHashes) {
      if (!map.has(hash)) {
        items.push({ id: hash, name: hash, values: [] });
      }
    }

    return { allOperationItems: items, hashToNameMap: map };
  }, [opsQuery.data, operationHashes]);

  // Build merged client items (all from stats + any saved clients not in stats)
  const allClientItems = useMemo<FilterItem[]>(() => {
    const statsClients = opsQuery.data?.target?.operationsStats?.clients?.edges ?? [];
    const clientNameSet = new Set(statsClients.map(e => e.node.name));

    const items: FilterItem[] = statsClients.map(e => ({
      name: e.node.name,
      values: e.node.versions.map(v => v.version),
    }));

    // Add saved clients not in current stats, preserving their versions
    for (const cf of clientFilters) {
      if (!clientNameSet.has(cf.name)) {
        items.push({ name: cf.name, values: cf.versions ?? [] });
      }
    }

    return items;
  }, [opsQuery.data, clientFilters]);

  // While stats are loading, use saved data as fallback for items
  const operationItems = opsQuery.fetching
    ? operationHashes.map(hash => ({ id: hash, name: hash, values: [] as string[] }))
    : allOperationItems;
  const clientItems = opsQuery.fetching
    ? clientFilters.map(c => ({ name: c.name, values: c.versions ?? [] }))
    : allClientItems;

  // Compute the "saved" selections (what's persisted in the database)
  const savedOperationSelections = useMemo<FilterSelection[]>(
    () =>
      operationHashes.map(hash => ({
        id: hash,
        name: hashToNameMap.get(hash) ?? hash,
        values: null,
      })),
    [operationHashes, hashToNameMap],
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
    setDateRange(savedDateRange);
  }, [filterDataKey]);

  // Detect changes from saved state (compare by identifiers, not display names)
  const hasChanges = useMemo(() => {
    if (showOperationFilter !== operationHashes.length > 0) return true;
    if (showClientFilter !== clientFilters.length > 0) return true;
    if (dateRange.from !== savedDateRange.from || dateRange.to !== savedDateRange.to) return true;

    const normalizeOps = (sels: FilterSelection[]) =>
      sels
        .map(s => s.id ?? s.name)
        .sort()
        .join('\0');
    if (normalizeOps(operationSelections) !== normalizeOps(savedOperationSelections)) return true;

    const normalizeClients = (sels: FilterSelection[]) =>
      JSON.stringify(
        sels
          .map(s => ({ name: s.name, values: s.values }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    if (normalizeClients(clientSelections) !== normalizeClients(savedClientSelections)) return true;

    return false;
  }, [
    operationSelections,
    clientSelections,
    showOperationFilter,
    showClientFilter,
    dateRange,
    savedOperationSelections,
    savedClientSelections,
    operationHashes,
    clientFilters,
    savedDateRange,
  ]);

  // Cancel → reset to saved state
  const handleCancel = useCallback(() => {
    setOperationSelections(savedOperationSelections);
    setClientSelections(savedClientSelections);
    setShowOperationFilter(operationHashes.length > 0);
    setShowClientFilter(clientFilters.length > 0);
    setDateRange(savedDateRange);
  }, [
    savedOperationSelections,
    savedClientSelections,
    operationHashes,
    clientFilters,
    savedDateRange,
  ]);

  // Update mutation
  const [updateResult, updateSavedFilter] = useMutation(ManageFilters_UpdateSavedFilterMutation);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
    // Extract hashes from selections (id is the hash, fallback to name for backwards compat)
    const newOperationHashes = showOperationFilter
      ? operationSelections.map(s => s.id ?? s.name)
      : [];

    const newClientFilters = showClientFilter
      ? clientSelections.map(s => ({
          name: s.name,
          versions:
            s.values === null ? (clientItems.find(i => i.name === s.name)?.values ?? []) : s.values,
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
          dateRange: { from: dateRange.from, to: dateRange.to },
        },
      },
    }).then(result => {
      if (result.error || result.data?.updateSavedFilter.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error?.message || result.data?.updateSavedFilter.error?.message,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Filter updated',
          description: 'The saved filter has been updated.',
        });
      }
    });
  }, [
    showOperationFilter,
    showClientFilter,
    operationSelections,
    clientSelections,
    clientItems,
    dateRange,
    filter.id,
    organizationSlug,
    projectSlug,
    targetSlug,
    updateSavedFilter,
    toast,
  ]);

  const loading = opsQuery.fetching;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker
          selectedRange={dateRange}
          onUpdate={({ preset }) => setDateRange(preset.range)}
          presets={availablePresets}
          validUnits={['y', 'M', 'w', 'd', 'h']}
        />
        {showOperationFilter && operationItems.length > 0 && (
          <FilterDropdown
            label="Operation"
            items={operationItems}
            value={operationSelections}
            onChange={setOperationSelections}
            onRemove={() => {
              setShowOperationFilter(false);
              setOperationSelections([]);
            }}
            disabled={loading}
          />
        )}
        {showClientFilter && clientItems.length > 0 && (
          <FilterDropdown
            label="Client"
            items={clientItems}
            value={clientSelections}
            onChange={setClientSelections}
            onRemove={() => {
              setShowClientFilter(false);
              setClientSelections([]);
            }}
            valuesLabel="versions"
            disabled={loading}
          />
        )}
        {loading && <Spinner />}
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

  const edges = query.data?.target?.savedFilters.edges ?? [];

  const stats = useMemo(() => {
    const filters = edges.map(e => e.node);
    return {
      total: filters.length,
      shared: filters.filter(f => f.visibility === SavedFilterVisibilityType.Shared).length,
      totalViews: filters.reduce((sum, f) => sum + f.viewsCount, 0),
    };
  }, [edges]);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

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
