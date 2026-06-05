import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, formatISO, subDays } from 'date-fns';
import { BellRing, ChevronDown, Lock, MoreVertical, Users } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Button as BaseButton } from '@/components/base/button/button';
import { DataTable } from '@/components/base/data-table/data-table';
import { FilterDropdown } from '@/components/base/floating/filter-dropdown/filter-dropdown';
import type { FilterItem, FilterSelection } from '@/components/base/floating/filter-dropdown/types';
import { Menu, MenuItem } from '@/components/base/floating/menu/menu';
import { PageLead } from '@/components/base/page-lead';
import { Page, TargetLayout } from '@/components/layouts/target';
import { BackLink } from '@/components/navigation/back-link';
import { savedFilterToSearchParams } from '@/components/target/insights/search-params';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  availablePresets,
  buildDateRangeString,
  DateRangePicker,
  type Preset,
} from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { SavedFilterVisibilityType } from '@/gql/graphql';
import { parse } from '@/lib/date-math';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Link } from '@tanstack/react-router';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';

export const ManageFilters_SavedFiltersQuery = graphql(`
  query ManageFilters_SavedFiltersQuery(
    $selector: TargetSelectorInput!
    $organizationSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      usageRetentionInDays
    }
    target(reference: { bySelector: $selector }) {
      id
      savedFilters(first: 50) {
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
              excludeOperations
              excludeClientFilters
            }
            createdBy {
              id
              displayName
            }
            viewerCanUpdate
            viewerCanDelete
            usedByAlertRulesCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      viewerCanCreateSavedFilter
      viewerCanShareSavedFilter
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
          name
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
            excludeOperations
            excludeClientFilters
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

function NameCell({
  filter,
  isRenaming,
  onStopRename,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  filter: SavedFilterNode;
  isRenaming: boolean;
  onStopRename: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [updateResult, updateSavedFilter] = useMutation(ManageFilters_UpdateSavedFilterMutation);
  const { toast } = useToast();
  const [renameValue, setRenameValue] = useState(filter.name);

  useEffect(() => {
    if (isRenaming) setRenameValue(filter.name);
  }, [isRenaming, filter.name]);

  const handleRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === filter.name) {
      onStopRename();
      return;
    }
    const result = await updateSavedFilter({
      input: {
        id: filter.id,
        target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
        name: trimmed,
      },
    });
    if (result.error || result.data?.updateSavedFilter.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error?.message || result.data?.updateSavedFilter.error?.message,
      });
    } else {
      toast({ title: 'Filter renamed', description: 'The saved filter has been renamed.' });
      onStopRename();
    }
  }, [
    renameValue,
    filter.name,
    filter.id,
    organizationSlug,
    projectSlug,
    targetSlug,
    updateSavedFilter,
    toast,
    onStopRename,
  ]);

  if (!isRenaming) return <span className="font-medium">{filter.name}</span>;

  return (
    <span className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <Input
        value={renameValue}
        onChange={e => setRenameValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') void handleRename();
          else if (e.key === 'Escape') onStopRename();
        }}
        className="h-8"
      />
      <Button
        variant="primary"
        size="sm"
        onClick={() => void handleRename()}
        disabled={
          updateResult.fetching || !renameValue.trim() || renameValue.trim() === filter.name
        }
      >
        Save
      </Button>
    </span>
  );
}

function VisibilityCell({ filter }: { filter: SavedFilterNode }) {
  return (
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
      {filter.usedByAlertRulesCount > 0 && (
        <span
          className="text-neutral-10 ml-1.5 inline-flex items-center gap-1 text-[13px]"
          title={`Used by ${filter.usedByAlertRulesCount} alert rule${
            filter.usedByAlertRulesCount === 1 ? '' : 's'
          }. Detach it from those alerts to delete.`}
        >
          <BellRing className="size-3.5" />
          In use
        </span>
      )}
    </span>
  );
}

function ActionsCell({
  filter,
  onRename,
  onDelete,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  filter: SavedFilterNode;
  onRename: () => void;
  onDelete: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <span className="flex justify-end" onClick={e => e.stopPropagation()}>
      <Menu
        trigger={
          <Button variant="ghost" className="flex size-8 p-0">
            <MoreVertical className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        }
        align="end"
        sections={[
          [
            <MenuItem
              key="view"
              render={
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/insights"
                  params={{ organizationSlug, projectSlug, targetSlug }}
                  search={savedFilterToSearchParams({
                    ...filter,
                    filters: {
                      ...filter.filters,
                      excludeOperations: filter.filters.excludeOperations ?? undefined,
                      excludeClientFilters: filter.filters.excludeClientFilters ?? undefined,
                    },
                  })}
                />
              }
            >
              View in Insights
            </MenuItem>,
            <MenuItem
              key="create-alert"
              render={
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/alerts/create"
                  params={{ organizationSlug, projectSlug, targetSlug }}
                  search={{ savedFilterId: filter.id }}
                />
              }
            >
              Create alert
            </MenuItem>,
            filter.viewerCanUpdate && (
              <MenuItem key="rename" onClick={onRename}>
                Rename
              </MenuItem>
            ),
            filter.viewerCanDelete &&
              (filter.usedByAlertRulesCount > 0 ? (
                // In use by an alert -> deletion is blocked (the server also enforces
                // this). Disable the item; the row's "In use" indicator explains why.
                <MenuItem key="delete" variant="destructiveAction" disabled>
                  Delete
                </MenuItem>
              ) : (
                <MenuItem key="delete" variant="destructiveAction" onClick={onDelete}>
                  Delete
                </MenuItem>
              )),
          ],
        ]}
      />
    </span>
  );
}

function SavedFilterRowFilters({
  filter,
  organizationSlug,
  projectSlug,
  targetSlug,
  dataRetentionInDays,
}: {
  filter: SavedFilterNode;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  dataRetentionInDays: number;
}) {
  const { operationHashes, clientFilters } = filter.filters;

  const savedDateRange = filter.filters.dateRange ?? DEFAULT_DATE_RANGE;
  const [dateRange, setDateRange] = useState(savedDateRange);

  const startDate = useMemo(() => subDays(new Date(), dataRetentionInDays), [dataRetentionInDays]);

  const selectedPreset = useMemo<Preset>(() => {
    const match = availablePresets.find(
      p => p.range.from === dateRange.from && p.range.to === dateRange.to,
    );
    if (match) return match;

    const from = parse(dateRange.from);
    const to = parse(dateRange.to);
    if (from && to) {
      return {
        name: `${dateRange.from}_${dateRange.to}`,
        label: buildDateRangeString({ from, to }),
        range: dateRange,
      };
    }

    return { name: 'last7d', label: 'Last 7 days', range: DEFAULT_DATE_RANGE };
  }, [dateRange]);

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

  const [opsQuery] = useQuery({
    query: ManageFilters_OperationStatsQuery,
    variables: {
      selector: { organizationSlug, projectSlug, targetSlug },
      period: resolvedPeriod,
    },
  });

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

    for (const hash of operationHashes) {
      if (!map.has(hash)) {
        items.push({ id: hash, name: hash, values: [], unavailable: true });
      }
    }

    return { allOperationItems: items, hashToNameMap: map };
  }, [opsQuery.data, operationHashes]);

  const allClientItems = useMemo<FilterItem[]>(() => {
    const statsClients = opsQuery.data?.target?.operationsStats?.clients?.edges ?? [];
    const clientNameSet = new Set(statsClients.map(e => e.node.name));

    const items: FilterItem[] = statsClients.map(e => ({
      name: e.node.name,
      values: e.node.versions.map(v => v.version),
    }));

    for (const cf of clientFilters) {
      if (!clientNameSet.has(cf.name)) {
        items.push({ name: cf.name, values: cf.versions ?? [], unavailable: true });
      }
    }

    return items;
  }, [opsQuery.data, clientFilters]);

  const operationItems = opsQuery.fetching
    ? operationHashes.map(hash => ({ id: hash, name: hash, values: [] as string[] }))
    : allOperationItems;
  const clientItems = opsQuery.fetching
    ? clientFilters.map(c => ({ name: c.name, values: c.versions ?? [] }))
    : allClientItems;

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

  const [operationSelections, setOperationSelections] =
    useState<FilterSelection[]>(savedOperationSelections);
  const [clientSelections, setClientSelections] =
    useState<FilterSelection[]>(savedClientSelections);
  const [showOperationFilter, setShowOperationFilter] = useState(operationHashes.length > 0);
  const [showClientFilter, setShowClientFilter] = useState(clientFilters.length > 0);
  const [excludeOperations, setExcludeOperations] = useState(
    filter.filters.excludeOperations ?? false,
  );
  const [excludeClientFilters, setExcludeClientFilters] = useState(
    filter.filters.excludeClientFilters ?? false,
  );

  const filterDataKey = JSON.stringify(filter.filters);
  useEffect(() => {
    setOperationSelections(savedOperationSelections);
    setClientSelections(savedClientSelections);
    setShowOperationFilter(operationHashes.length > 0);
    setShowClientFilter(clientFilters.length > 0);
    setDateRange(savedDateRange);
    setExcludeOperations(filter.filters.excludeOperations ?? false);
    setExcludeClientFilters(filter.filters.excludeClientFilters ?? false);
  }, [filterDataKey]);

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

    if (excludeOperations !== (filter.filters.excludeOperations ?? false)) return true;
    if (excludeClientFilters !== (filter.filters.excludeClientFilters ?? false)) return true;

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
    excludeOperations,
    excludeClientFilters,
    filter.filters.excludeOperations,
    filter.filters.excludeClientFilters,
  ]);

  const handleCancel = useCallback(() => {
    setOperationSelections(savedOperationSelections);
    setClientSelections(savedClientSelections);
    setShowOperationFilter(operationHashes.length > 0);
    setShowClientFilter(clientFilters.length > 0);
    setDateRange(savedDateRange);
    setExcludeOperations(filter.filters.excludeOperations ?? false);
    setExcludeClientFilters(filter.filters.excludeClientFilters ?? false);
  }, [
    savedOperationSelections,
    savedClientSelections,
    operationHashes,
    clientFilters,
    savedDateRange,
    filter.filters.excludeOperations,
    filter.filters.excludeClientFilters,
  ]);

  const [updateResult, updateSavedFilter] = useMutation(ManageFilters_UpdateSavedFilterMutation);
  const { toast } = useToast();

  const handleSave = useCallback(async () => {
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
        target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
        insightsFilter: {
          operationHashes: newOperationHashes,
          clientFilters: newClientFilters,
          dateRange: { from: dateRange.from, to: dateRange.to },
          excludeOperations,
          excludeClientFilters,
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
    excludeOperations,
    excludeClientFilters,
    filter.id,
    organizationSlug,
    projectSlug,
    targetSlug,
    updateSavedFilter,
    toast,
  ]);

  const loading = opsQuery.fetching;

  return (
    <div className="px-10 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker
          trigger={
            <BaseButton
              label={selectedPreset.label}
              variant="default"
              rightIcon={{ icon: ChevronDown, withSeparator: true }}
            />
          }
          selectedRange={dateRange}
          onUpdate={({ preset }) => setDateRange(preset.range)}
          startDate={startDate}
          validUnits={['y', 'M', 'w', 'd', 'h']}
          align="start"
        />
        {showOperationFilter && operationItems.length > 0 && (
          <FilterDropdown
            label="Operation"
            items={operationItems}
            selectedItems={operationSelections}
            onChange={setOperationSelections}
            onRemove={() => {
              setShowOperationFilter(false);
              setOperationSelections([]);
              setExcludeOperations(false);
            }}
            disabled={loading}
            excludeMode={excludeOperations}
            onExcludeModeChange={setExcludeOperations}
          />
        )}
        {showClientFilter && clientItems.length > 0 && (
          <FilterDropdown
            label="Client"
            items={clientItems}
            selectedItems={clientSelections}
            onChange={setClientSelections}
            onRemove={() => {
              setShowClientFilter(false);
              setClientSelections([]);
              setExcludeClientFilters(false);
            }}
            valuesLabel="versions"
            disabled={loading}
            excludeMode={excludeClientFilters}
            onExcludeModeChange={setExcludeClientFilters}
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

const columnHelper = createColumnHelper<SavedFilterNode>();

function ManageFiltersContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [, deleteSavedFilter] = useMutation(ManageFilters_DeleteSavedFilterMutation);
  const { toast } = useToast();
  const [query] = useQuery({
    query: ManageFilters_SavedFiltersQuery,
    variables: {
      organizationSlug,
      selector: { organizationSlug, projectSlug, targetSlug },
    },
  });

  const dataRetentionInDays = query.data?.organization?.usageRetentionInDays ?? 30;
  const edges = query.data?.target?.savedFilters.edges ?? [];

  const handleDelete = useCallback(
    (filter: SavedFilterNode) => {
      void deleteSavedFilter({
        input: {
          target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
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
          toast({ title: 'Filter deleted', description: 'The saved filter has been deleted.' });
        }
      });
    },
    [deleteSavedFilter, organizationSlug, projectSlug, targetSlug, toast],
  );

  const filters: SavedFilterNode[] = useMemo(() => edges.map(e => e.node), [edges]);

  const stats = useMemo(
    () => ({
      total: filters.length,
      shared: filters.filter(f => f.visibility === SavedFilterVisibilityType.Shared).length,
      totalViews: filters.reduce((sum, f) => sum + f.viewsCount, 0),
    }),
    [filters],
  );

  const columns = useMemo<ColumnDef<SavedFilterNode, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: info => (
          <NameCell
            filter={info.row.original}
            isRenaming={renamingId === info.row.original.id}
            onStopRename={() => setRenamingId(null)}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            targetSlug={targetSlug}
          />
        ),
      }),
      columnHelper.accessor('viewsCount', {
        header: 'Views',
        cell: info => info.getValue().toLocaleString(),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: info => formatDate(info.getValue(), 'MMM d, yyyy'),
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Modified',
        cell: info => formatDate(info.getValue(), 'MMM d, yyyy'),
      }),
      columnHelper.display({
        id: 'visibility',
        header: 'Visibility',
        cell: ctx => <VisibilityCell filter={ctx.row.original} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ctx => (
          <ActionsCell
            filter={ctx.row.original}
            onRename={() => setRenamingId(ctx.row.original.id)}
            onDelete={() => handleDelete(ctx.row.original)}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            targetSlug={targetSlug}
          />
        ),
      }),
    ],
    [renamingId, handleDelete, organizationSlug, projectSlug, targetSlug],
  );

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (!query.data?.target) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center py-28">
        <Spinner />
      </div>
    );
  }

  if (filters.length === 0) {
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
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Filters" value={stats.total} />
        <StatCard label="Shared Filters" value={stats.shared} />
        <StatCard label="Total Views" value={stats.totalViews} />
      </div>

      <div className="mt-8">
        <DataTable
          data={filters}
          columns={columns}
          getRowId={f => f.id}
          hideRowIndicator
          renderSubComponent={row => (
            <SavedFilterRowFilters
              filter={row.original}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              targetSlug={targetSlug}
              dataRetentionInDays={dataRetentionInDays}
            />
          )}
        />
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

export function TargetInsightsManageFiltersPage({
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  return (
    <>
      <Meta title="Manage saved filters" />
      <TargetLayout
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        page={Page.Insights}
      >
        <div className="pb-3 pt-6">
          <BackLink
            copy="Back to Insights"
            link={{
              params: { organizationSlug, projectSlug, targetSlug },
              search: {},
              to: '/$organizationSlug/$projectSlug/$targetSlug/insights',
            }}
          />

          <PageLead
            title="Manage saved filters"
            description="View and manage your saved filter views"
          />
        </div>
        <ManageFiltersContent
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      </TargetLayout>
    </>
  );
}
