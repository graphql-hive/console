import { ReactElement, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { FilterDropdown } from '@/components/base/filter-dropdown/filter-dropdown';
import type { FilterItem, FilterSelection } from '@/components/base/filter-dropdown/types';
import type { SavedView } from '@/components/base/insights-filters';
import { InsightsFilters } from '@/components/base/insights-filters';
import { Page, TargetLayout } from '@/components/layouts/target';
import { OperationsList } from '@/components/target/insights/List';
import { OperationsStats } from '@/components/target/insights/Stats';
import { Button } from '@/components/ui/button';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { graphql } from '@/gql';
import { OperationStatsFilterInput, SavedFilterVisibilityType } from '@/gql/graphql';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { useNavigate, useSearch } from '@tanstack/react-router';

const InsightsClientFilter = z.object({
  name: z.string(),
  versions: z.array(z.string()).nullable().default(null),
});

export const InsightsFilterSearch = z.object({
  operations: z.array(z.string()).optional(),
  clients: z.array(InsightsClientFilter).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

type InsightsFilterState = z.infer<typeof InsightsFilterSearch>;

function buildGraphQLFilter(state: InsightsFilterState): OperationStatsFilterInput {
  return {
    operationIds: state.operations?.length ? state.operations : undefined,
    clientVersionFilters:
      state.clients?.length
        ? state.clients.map(c => ({
            clientName: c.name,
            versions: c.versions,
          }))
        : undefined,
  };
}

const InsightsFilterPicker_Query = graphql(`
  query InsightsFilterPicker($selector: TargetSelectorInput!, $period: DateRangeInput!) {
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
      savedFilters(type: INSIGHTS, first: 50) {
        edges {
          node {
            id
            name
            visibility
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
  }
`);

const InsightsTrackView_Mutation = graphql(`
  mutation InsightsTrackView($input: TrackSavedFilterViewInput!) {
    trackSavedFilterView(input: $input) {
      ok {
        savedFilter {
          id
          viewsCount
        }
      }
    }
  }
`);

function OperationsView({
  organizationSlug,
  projectSlug,
  targetSlug,
  dataRetentionInDays,
}: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  dataRetentionInDays: number;
}): ReactElement {
  const search = useSearch({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug/insights',
  });
  const navigate = useNavigate();
  const dateRangeController = useDateRangeController({
    dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  const [pickerQuery] = useQuery({
    query: InsightsFilterPicker_Query,
    variables: {
      selector: { organizationSlug, projectSlug, targetSlug },
      period: dateRangeController.resolvedRange,
    },
  });

  const operationFilterItems: FilterItem[] = useMemo(() => {
    const edges = pickerQuery.data?.target?.operationsStats?.operations?.edges ?? [];
    return edges
      .filter(e => e.node.operationHash != null)
      .map(e => ({
        id: e.node.operationHash!,
        name: e.node.name,
        values: [],
      }));
  }, [pickerQuery.data]);

  const clientFilterItems: FilterItem[] = useMemo(() => {
    const edges = pickerQuery.data?.target?.operationsStats?.clients?.edges ?? [];
    return edges.map(e => ({
      name: e.node.name,
      values: e.node.versions.map(v => v.version),
    }));
  }, [pickerQuery.data]);

  // Build a hash→name map for converting search state hashes back to display names
  const hashToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of operationFilterItems) {
      if (item.id) {
        map.set(item.id, item.name);
      }
    }
    return map;
  }, [operationFilterItems]);

  const operationFilterSelections: FilterSelection[] = useMemo(
    () =>
      (search.operations ?? []).map(hash => ({
        id: hash,
        name: hashToNameMap.get(hash) ?? hash,
        values: null,
      })),
    [search.operations, hashToNameMap],
  );

  const clientFilterSelections: FilterSelection[] = useMemo(
    () =>
      (search.clients ?? []).map(c => ({
        name: c.name,
        values: c.versions,
      })),
    [search.clients],
  );

  const { privateViews, sharedViews } = useMemo(() => {
    const edges = pickerQuery.data?.target?.savedFilters?.edges ?? [];
    const privateViews: SavedView[] = [];
    const sharedViews: SavedView[] = [];

    for (const edge of edges) {
      const node = edge.node;
      const view: SavedView = {
        id: node.id,
        name: node.name,
        filters: {
          operationHashes: node.filters.operationHashes,
          clientFilters: node.filters.clientFilters.map(c => ({
            name: c.name,
            versions: c.versions ?? null,
          })),
          dateRange: node.filters.dateRange ?? null,
        },
      };

      if (node.visibility === SavedFilterVisibilityType.Private) {
        privateViews.push(view);
      } else {
        sharedViews.push(view);
      }
    }

    return { privateViews, sharedViews };
  }, [pickerQuery.data]);

  const [, trackView] = useMutation(InsightsTrackView_Mutation);

  const handleApplyView = useCallback(
    (view: SavedView) => {
      void trackView({
        input: {
          target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
          id: view.id,
        },
      });

      void navigate({
        search: prev => ({
          ...prev,
          operations:
            view.filters.operationHashes.length > 0
              ? view.filters.operationHashes
              : undefined,
          clients:
            view.filters.clientFilters.length > 0
              ? view.filters.clientFilters.map(c => ({
                  name: c.name,
                  versions: c.versions,
                }))
              : undefined,
          from: view.filters.dateRange?.from,
          to: view.filters.dateRange?.to,
        }),
      });
    },
    [navigate, trackView, organizationSlug, projectSlug, targetSlug],
  );

  const filter = useMemo(() => buildGraphQLFilter(search), [search]);

  return (
    <>
      <div className="py-6">
        <div>
          <Title>Insights</Title>
          <Subtitle>Observe GraphQL requests and see how the API is consumed.</Subtitle>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <InsightsFilters
              operationFilterItems={operationFilterItems}
              operationFilterSelections={operationFilterSelections}
              clientFilterItems={clientFilterItems}
              clientFilterSelections={clientFilterSelections}
              privateViews={privateViews}
              sharedViews={sharedViews}
              onApplyView={handleApplyView}
              onManageViews={() => {
                void navigate({
                  to: '/$organizationSlug/$projectSlug/$targetSlug/insights/manage-filters',
                  params: { organizationSlug, projectSlug, targetSlug },
                });
              }}
              setOperationSelections={selections => {
                void navigate({
                  search: prev => ({
                    ...prev,
                    operations:
                      selections.length > 0
                        ? selections.map(s => s.id ?? s.name)
                        : undefined,
                  }),
                });
              }}
              setClientSelections={selections => {
                void navigate({
                  search: prev => ({
                    ...prev,
                    clients:
                      selections.length > 0
                        ? selections.map(s => ({
                            name: s.name,
                            versions: s.values,
                          }))
                        : undefined,
                  }),
                });
              }}
            />
            {operationFilterSelections.length > 0 && (
              <FilterDropdown
                label="Operation"
                items={operationFilterItems}
                value={operationFilterSelections}
                onChange={selections => {
                  void navigate({
                    search: prev => ({
                      ...prev,
                      operations:
                        selections.length > 0
                          ? selections.map(s => s.id ?? s.name)
                          : undefined,
                    }),
                  });
                }}
                onRemove={() => {
                  void navigate({
                    search: prev => ({ ...prev, operations: undefined }),
                  });
                }}
              />
            )}
            {clientFilterSelections.length > 0 && (
              <FilterDropdown
                label="Client"
                items={clientFilterItems}
                value={clientFilterSelections}
                valuesLabel="versions"
                onChange={selections => {
                  void navigate({
                    search: prev => ({
                      ...prev,
                      clients:
                        selections.length > 0
                          ? selections.map(s => ({
                              name: s.name,
                              versions: s.values,
                            }))
                          : undefined,
                    }),
                  });
                }}
                onRemove={() => {
                  void navigate({
                    search: prev => ({ ...prev, clients: undefined }),
                  });
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-x-2">
            <DateRangePicker
              validUnits={['y', 'M', 'w', 'd', 'h']}
              selectedRange={dateRangeController.selectedPreset.range}
              startDate={dateRangeController.startDate}
              align="end"
              onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
            />
            <Button variant="outline" onClick={() => dateRangeController.refreshResolvedRange()}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <OperationsStats
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        period={dateRangeController.resolvedRange}
        filter={filter}
        dateRangeText={dateRangeController.selectedPreset.label}
        mode="operation-list"
        resolution={dateRangeController.resolution}
      />
      <OperationsList
        className="mt-12"
        period={dateRangeController.resolvedRange}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        filter={filter}
        selectedPeriod={dateRangeController.selectedPreset.range}
      />
    </>
  );
}

const TargetOperationsPageQuery = graphql(`
  query TargetOperationsPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      usageRetentionInDays
    }
    hasCollectedOperations(
      selector: {
        organizationSlug: $organizationSlug
        projectSlug: $projectSlug
        targetSlug: $targetSlug
      }
    )
  }
`);

function TargetOperationsPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [query] = useQuery({
    query: TargetOperationsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const currentOrganization = query.data?.organization;
  const hasCollectedOperations = query.data?.hasCollectedOperations === true;

  if (!currentOrganization) {
    return null;
  }

  if (!hasCollectedOperations) {
    return (
      <div className="py-8">
        <EmptyList
          title="Hive is waiting for your first collected operation"
          description="You can collect usage of your GraphQL API with Hive Client"
          docsUrl="/features/usage-reporting"
        />
      </div>
    );
  }

  return (
    <OperationsView
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
      targetSlug={props.targetSlug}
      dataRetentionInDays={currentOrganization.usageRetentionInDays}
    />
  );
}

export function TargetInsightsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Insights" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Insights}
      >
        <TargetOperationsPageContent {...props} />
      </TargetLayout>
    </>
  );
}
