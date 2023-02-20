import {
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { formatISO } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { DocumentType, gql, useQuery } from 'urql';
import { Button, DataWrapper, Stat, Table, TBody, Td, Th, THead, Tr } from '@/components/v2';
import { CHART_PRIMARY_COLOR } from '@/constants';
import { env } from '@/env/frontend';
import { OrganizationType } from '@/graphql';
import { theme } from '@/lib/charts';
import { useChartStyles } from '@/utils';
import { ChevronUpIcon } from '@radix-ui/react-icons';
import {
  createTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useTableInstance,
} from '@tanstack/react-table';

interface Organization {
  name: ReactElement;
  members: string;
  type: OrganizationType;
  users: number;
  projects: number;
  targets: number;
  versions: number;
  persistedOperations: number;
  operations: any;
}

const table = createTable().setRowType<Organization>();

function formatNumber(value: number) {
  return Intl.NumberFormat().format(value);
}

function sumByKey<
  T extends {
    [key in K]: number;
  },
  K extends keyof T,
>(list: T[], key: K): number {
  return list.reduce((total, node) => total + node[key], 0);
}

export type Filters = Partial<{
  'only-regular': boolean;
  'with-projects': boolean;
  'with-targets': boolean;
  'with-schema-pushes': boolean;
  'with-persisted': boolean;
  'with-collected': boolean;
}>;

const CollectedOperationsOverTime_OperationFragment = gql(/* GraphQL */ `
  fragment CollectedOperationsOverTime_OperationFragment on AdminOperationPoint {
    count
    date
  }
`);

function CollectedOperationsOverTime({
  dateRange,
  operations,
}: {
  dateRange: {
    from: Date;
    to: Date;
  };
  operations: DocumentType<typeof CollectedOperationsOverTime_OperationFragment>[];
}): ReactElement {
  const dataRef = useRef<[string, number][]>();
  dataRef.current ||= operations.map(node => [node.date, node.count]);
  const data = dataRef.current;
  return (
    <AutoSizer disableHeight>
      {size => (
        <ReactECharts
          style={{ width: size.width, height: 200 }}
          theme={theme.theme}
          option={{
            ...useChartStyles(),
            grid: {
              left: 50,
              top: 50,
              right: 20,
              bottom: 20,
            },
            tooltip: {
              trigger: 'axis',
            },
            legend: {},
            xAxis: [
              {
                type: 'time',
                boundaryGap: false,
                min: dateRange.from,
                max: dateRange.to,
              },
            ],
            yAxis: [{ type: 'value', min: 0 }],
            series: [
              {
                type: 'line',
                name: 'Collected operations',
                showSymbol: false,
                smooth: true,
                color: CHART_PRIMARY_COLOR,
                areaStyle: {},
                emphasis: {
                  focus: 'series',
                },
                large: true,
                data,
              },
            ],
          }}
        />
      )}
    </AutoSizer>
  );
}

function OverallStat({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <Stat>
      <Stat.Label>{label}</Stat.Label>
      <Stat.Number>{formatNumber(value)}</Stat.Number>
    </Stat>
  );
}

const AdminStatsQuery = gql(/* GraphQL */ `
  query adminStats($period: DateRangeInput!) {
    admin {
      stats(period: $period) {
        organizations {
          organization {
            id
            cleanId
            name
            type
            owner {
              user {
                email
              }
            }
            members {
              nodes {
                user {
                  id
                  email
                }
              }
            }
          }
          versions
          users
          projects
          targets
          persistedOperations
          operations
        }
        general {
          operationsOverTime {
            ...CollectedOperationsOverTime_OperationFragment
          }
        }
      }
    }
  }
`);

function filterStats(
  row: DocumentType<typeof AdminStatsQuery>['admin']['stats']['organizations'][0],
  filters: Filters,
) {
  if (filters['only-regular'] && row.organization.type !== 'REGULAR') {
    return false;
  }

  if (filters['with-projects'] && row.projects === 0) {
    return false;
  }

  if (filters['with-targets'] && row.targets === 0) {
    return false;
  }

  if (filters['with-schema-pushes'] && row.versions === 0) {
    return false;
  }

  if (filters['with-persisted'] && row.persistedOperations === 0) {
    return false;
  }

  if (filters['with-collected'] && row.operations === 0) {
    return false;
  }

  return true;
}

const columns = [
  table.createDataColumn('name', {
    header: 'Organization',
    footer: props => props.column.id,
    enableSorting: false,
  }),
  table.createDataColumn('type', {
    header: 'Type',
    footer: props => props.column.id,
  }),
  table.createDataColumn('members', {
    header: 'Members',
    footer: props => props.column.id,
  }),
  table.createDataColumn('users', {
    header: 'Users',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
  table.createDataColumn('projects', {
    header: 'Projects',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
  table.createDataColumn('targets', {
    header: 'Targets',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
  table.createDataColumn('versions', {
    header: 'Schema pushes',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
  table.createDataColumn('persistedOperations', {
    header: 'Persisted Ops',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
  table.createDataColumn('operations', {
    header: 'Collected Ops',
    footer: props => props.column.id,
    meta: { align: 'right' },
  }),
];

function OrganizationTable({ data }: { data: Organization[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const tableInstance = useTableInstance(table, {
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: env.nodeEnv !== 'production',
  });

  const firstPage = useCallback(() => {
    tableInstance.setPageIndex(0);
  }, [tableInstance]);
  const lastPage = useCallback(() => {
    tableInstance.setPageIndex(tableInstance.getPageCount() - 1);
  }, [tableInstance]);

  const headerGroup = tableInstance.getHeaderGroups()[0];

  return (
    <>
      <Table>
        <THead>
          {headerGroup.headers.map(header => {
            const align =
              (header.column.columnDef.meta as { align: 'right' } | undefined)?.align ?? 'left';
            const isSorted = header.column.getIsSorted() !== false;
            return (
              <Th
                key={header.id}
                align={align}
                onClick={isSorted ? header.column.getToggleSortingHandler() : undefined}
                className={isSorted ? 'cursor-pointer' : ''}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{header.renderHeader()}</span>
                  {isSorted && (
                    <ChevronUpIcon
                      className={clsx(
                        header.column.getIsSorted() === 'desc' && 'rotate-180',
                        'w-auto h-5',
                      )}
                    />
                  )}
                </div>
              </Th>
            );
          })}
        </THead>
        <TBody>
          {tableInstance.getRowModel().rows.map(row => (
            <Tr key={row.id}>
              {row.getVisibleCells().map(cell => {
                const isNumeric = typeof cell.getValue() === 'number';
                const isReact =
                  typeof cell.getValue() === 'object' && isValidElement(cell.getValue());
                const align =
                  (cell.column.columnDef.meta as { align: 'right' } | undefined)?.align ?? 'left';
                return (
                  <Td key={cell.id} align={align}>
                    {isNumeric
                      ? formatNumber(cell.getValue() as number)
                      : isReact
                      ? (cell.getValue() as ReactNode)
                      : cell.renderCell()}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </TBody>
      </Table>

      <div className="py-3 flex flex-row items-center justify-center gap-4">
        <Button
          variant="secondary"
          onClick={firstPage}
          disabled={!tableInstance.getCanPreviousPage()}
        >
          First
        </Button>
        <Button
          variant="secondary"
          aria-label="Go to previous page"
          onClick={tableInstance.previousPage}
          disabled={!tableInstance.getCanPreviousPage()}
        >
          <ChevronUpIcon className="-rotate-90 h-5 w-auto" />
        </Button>
        <span className="font-bold whitespace-nowrap text-sm">
          {tableInstance.getState().pagination.pageIndex + 1} / {tableInstance.getPageCount()}
        </span>
        <Button
          variant="secondary"
          aria-label="Go to next page"
          onClick={tableInstance.nextPage}
          disabled={!tableInstance.getCanNextPage()}
        >
          <ChevronUpIcon className="rotate-90 h-5 w-auto" />
        </Button>
        <Button variant="secondary" onClick={lastPage} disabled={!tableInstance.getCanNextPage()}>
          Last
        </Button>
      </div>
    </>
  );
}

export function AdminStats({
  dateRange,
  filters,
}: {
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: Filters;
}): ReactElement {
  const [query] = useQuery({
    query: AdminStatsQuery,
    variables: {
      period: {
        from: formatISO(dateRange.from),
        to: formatISO(dateRange.to),
      },
    },
  });

  const tableData = useMemo(
    () =>
      (query.data?.admin?.stats.organizations ?? [])
        .filter(node => filterStats(node, filters))
        .map(node => ({
          name: (
            <div>
              <div style={{ paddingBottom: 5, fontWeight: 'bold' }}>{node.organization.name}</div>
              <pre title="id">{node.organization.id}</pre>
              <pre title="clean id">{node.organization.cleanId}</pre>
              <pre title="owner">{node.organization.owner.user.email}</pre>
            </div>
          ),
          members: (node.organization.members.nodes || []).map(v => v.user.email).join(', '),
          type: node.organization.type,
          users: node.users,
          projects: node.projects,
          targets: node.targets,
          versions: node.versions,
          persistedOperations: node.persistedOperations,
          operations: node.operations,
        })),
    [query.data, filters],
  );

  const overall = useMemo(
    () => ({
      users: tableData.reduce((total, node) => (node.type === 'PERSONAL' ? total + 1 : total), 0),
      organizations: tableData.length,
      projects: sumByKey(tableData, 'projects'),
      targets: sumByKey(tableData, 'targets'),
      versions: sumByKey(tableData, 'versions'),
      persistedOperations: sumByKey(tableData, 'persistedOperations'),
      operations: sumByKey(tableData, 'operations'),
    }),
    [tableData],
  );

  return (
    <DataWrapper query={query}>
      {({ data }) => (
        <div className="flex flex-col gap-6">
          <div className="flex rounded-md p-5 border border-gray-800 bg-gray-900/50 justify-between">
            <OverallStat label="Users" value={overall.users} />
            <OverallStat label="Organizations" value={overall.organizations} />
            <OverallStat label="Projects" value={overall.projects} />
            <OverallStat label="Targets" value={overall.targets} />
            <OverallStat label="Schema Pushes" value={overall.versions} />
            <OverallStat label="Persisted Ops" value={overall.persistedOperations} />
            <OverallStat label="Collected Ops" value={overall.operations} />
          </div>
          <CollectedOperationsOverTime
            dateRange={dateRange}
            operations={data.admin.stats.general.operationsOverTime}
          />
          <OrganizationTable data={tableData} />
        </div>
      )}
    </DataWrapper>
  );
}
