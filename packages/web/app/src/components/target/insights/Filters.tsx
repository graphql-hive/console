import { ChangeEvent, ComponentType, ReactElement, useCallback, useEffect, useState } from 'react';
import { FilterIcon } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { useQuery } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox, Input } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DateRangeInput } from '@/gql/graphql';
import { useFormattedNumber, useToggle } from '@/lib/hooks';

const OperationsFilter_OperationStatsValuesConnectionFragment = graphql(`
  fragment OperationsFilter_OperationStatsValuesConnectionFragment on OperationStatsValuesConnection {
    edges {
      node {
        id
        operationHash
        name
        ...OperationRow_OperationStatsValuesFragment
      }
    }
  }
`);

function OperationsFilter({
  onClose,
  isOpen,
  onFilter,
  operationStatsConnection,
  selected,
  clientOperationStatsConnection,
}: {
  onClose(): void;
  onFilter(keys: string[]): void;
  isOpen: boolean;
  operationStatsConnection: FragmentType<
    typeof OperationsFilter_OperationStatsValuesConnectionFragment
  >;
  clientOperationStatsConnection?:
    | FragmentType<typeof OperationsFilter_OperationStatsValuesConnectionFragment>
    | undefined;
  selected?: string[];
}): ReactElement {
  const operations = useFragment(
    OperationsFilter_OperationStatsValuesConnectionFragment,
    operationStatsConnection,
  );

  const clientFilteredOperations = useFragment(
    OperationsFilter_OperationStatsValuesConnectionFragment,
    clientOperationStatsConnection,
  );

  function getOperationHashes() {
    const items: string[] = [];
    for (const { node: op } of operations.edges) {
      if (op.operationHash) {
        items.push(op.operationHash);
      }
    }
    return items;
  }

  const [selectedItems, setSelectedItems] = useState<string[]>(() =>
    getOperationHashes().filter(hash => selected?.includes(hash) ?? true),
  );

  const onSelect = useCallback(
    (operationHash: string, selected: boolean) => {
      const itemAt = selectedItems.findIndex(hash => hash === operationHash);
      const exists = itemAt > -1;

      if (selected && !exists) {
        setSelectedItems([...selectedItems, operationHash]);
      } else if (!selected && exists) {
        setSelectedItems(selectedItems.filter(hash => hash !== operationHash));
      }
    },
    [selectedItems, setSelectedItems],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedFilter = useDebouncedCallback((value: string) => {
    setVisibleOperations(
      operations.edges.filter(({ node: op }) =>
        op.name.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
      ),
    );
  }, 500);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;

      setSearchTerm(value);
      debouncedFilter(value);
    },
    [setSearchTerm, debouncedFilter],
  );

  const [visibleOperations, setVisibleOperations] = useState(operations.edges);

  const selectAll = useCallback(() => {
    setSelectedItems(getOperationHashes());
  }, [operations]);
  const selectNone = useCallback(() => {
    setSelectedItems([]);
  }, [setSelectedItems]);

  const renderRow = useCallback<ComponentType<ListChildComponentProps>>(
    ({ index, style }) => {
      const operation = visibleOperations[index].node;
      const clientOpStats = clientFilteredOperations?.edges.find(
        e => e.node.operationHash === operation.operationHash,
      )?.node;

      return (
        <OperationRow
          style={style}
          key={operation.id}
          operationStats={operation}
          clientOperationStats={clientFilteredOperations === null ? false : clientOpStats}
          selected={selectedItems.includes(operation.operationHash || '')}
          onSelect={onSelect}
        />
      );
    },
    [visibleOperations, selectedItems, onSelect, clientFilteredOperations],
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Filter by operation</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col space-y-3 py-4">
          <Input
            size="medium"
            placeholder="Search for operation..."
            onChange={onChange}
            value={searchTerm}
            onClear={() => {
              setSearchTerm('');
              setVisibleOperations(operations.edges);
            }}
          />
          <div className="flex w-full items-center gap-2">
            <Button variant="link" onClick={selectAll}>
              All
            </Button>
            <Button variant="link" onClick={selectNone}>
              None
            </Button>
            <Button className="ml-auto" onClick={selectAll}>
              Reset
            </Button>
            <Button
              variant="primary"
              disabled={selectedItems.length === 0}
              onClick={() => {
                onFilter(selectedItems);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
          <div className="grow pl-1">
            {clientFilteredOperations && (
              <div className="text-right text-xs text-gray-600">
                <span className="text-gray-500">selected</span> / all clients
              </div>
            )}
            <AutoSizer>
              {({ height, width }) =>
                !height || !width ? (
                  <></>
                ) : (
                  <FixedSizeList
                    height={height}
                    width={width}
                    itemCount={visibleOperations.length}
                    itemSize={24}
                    overscanCount={5}
                  >
                    {renderRow}
                  </FixedSizeList>
                )
              }
            </AutoSizer>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const OperationsFilterContainer_OperationStatsQuery = graphql(`
  query OperationsFilterContainer_OperationStatsQuery(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $filter: OperationStatsFilterInput
    $hasFilter: Boolean!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      operationsStats(period: $period) {
        operations {
          edges {
            __typename
          }
          ...OperationsFilter_OperationStatsValuesConnectionFragment
        }
      }
      clientOperationStats: operationsStats(period: $period, filter: $filter)
        @include(if: $hasFilter) {
        operations {
          edges {
            __typename
          }
          ...OperationsFilter_OperationStatsValuesConnectionFragment
        }
      }
    }
  }
`);

function OperationsFilterContainer({
  period,
  isOpen,
  onClose,
  onFilter,
  selected,
  organizationSlug,
  projectSlug,
  targetSlug,
  clientNames,
}: {
  onFilter(keys: string[]): void;
  onClose(): void;
  isOpen: boolean;
  period: DateRangeInput;
  selected?: string[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  clientNames?: string[];
}): ReactElement | null {
  const [query, refresh] = useQuery({
    query: OperationsFilterContainer_OperationStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      period,
      filter: clientNames ? { clientNames } : undefined,
      hasFilter: !!clientNames?.length,
    },
  });

  useEffect(() => {
    if (!query.fetching) {
      refresh({ requestPolicy: 'network-only' });
    }
  }, [period]);

  if (!isOpen) {
    return null;
  }

  if (query.fetching || query.error || !query.data?.target) {
    return <Spinner />;
  }

  const { target } = query.data;

  return (
    <OperationsFilter
      operationStatsConnection={target.operationsStats.operations}
      clientOperationStatsConnection={target.clientOperationStats?.operations}
      selected={selected}
      isOpen={isOpen}
      onClose={onClose}
      onFilter={hashes => {
        onFilter(hashes.length === target.operationsStats.operations.edges.length ? [] : hashes);
      }}
    />
  );
}

const OperationRow_OperationStatsValuesFragment = graphql(`
  fragment OperationRow_OperationStatsValuesFragment on OperationStatsValues {
    id
    name
    operationHash
    count
  }
`);

function OperationRow({
  operationStats,
  clientOperationStats,
  selected,
  onSelect,
  style,
}: {
  operationStats: FragmentType<typeof OperationRow_OperationStatsValuesFragment>;
  /** Stats for the operation filtered by the selected clients */
  clientOperationStats?:
    | FragmentType<typeof OperationRow_OperationStatsValuesFragment>
    | null
    | false;
  selected: boolean;
  onSelect(id: string, selected: boolean): void;
  style: any;
}): ReactElement {
  const operation = useFragment(OperationRow_OperationStatsValuesFragment, operationStats);
  const requests = useFormattedNumber(operation.count);
  const clientsOperation = useFragment(
    OperationRow_OperationStatsValuesFragment,
    clientOperationStats || null,
  );
  const hasClientOperation = clientOperationStats !== false;
  const clientsRequests = useFormattedNumber(clientsOperation?.count);
  const hash = operation.operationHash || '';
  const change = useCallback(() => {
    if (hash) {
      onSelect(hash, !selected);
    }
  }, [onSelect, hash, selected]);

  const Totals = () => {
    if (hasClientOperation) {
      return (
        <div className="flex shrink-0 text-right text-gray-500">
          <span>{clientsRequests === '-' ? 0 : clientsRequests}</span>
          <span className="ml-1 truncate text-gray-600">/ {requests}</span>
        </div>
      );
    }
    return <div className="shrink-0 text-right text-gray-600">{requests}</div>;
  };

  return (
    <div style={style} className="flex items-center gap-4 truncate">
      <Checkbox checked={selected} onCheckedChange={change} id={hash} />
      <label
        htmlFor={hash}
        className="flex w-full cursor-pointer items-center justify-between gap-4 overflow-hidden"
      >
        <span className="grow overflow-hidden text-ellipsis">{operation.name}</span>
        <Totals />
      </label>
    </div>
  );
}

export function OperationsFilterTrigger({
  period,
  onFilter,
  selected,
  organizationSlug,
  projectSlug,
  targetSlug,
  clientNames,
}: {
  period: DateRangeInput;
  onFilter(keys: string[]): void;
  selected?: string[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  clientNames?: string[];
}): ReactElement {
  const [isOpen, toggle] = useToggle();

  return (
    <>
      <Button variant="outline" className="bg-accent" onClick={toggle}>
        <span>Operations ({selected?.length || 'all'})</span>
        <FilterIcon className="ml-2 size-4" />
      </Button>
      <OperationsFilterContainer
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        isOpen={isOpen}
        onClose={toggle}
        period={period}
        selected={selected}
        onFilter={onFilter}
        clientNames={clientNames}
      />
    </>
  );
}

const ClientRow_ClientStatsValuesFragment = graphql(`
  fragment ClientRow_ClientStatsValuesFragment on ClientStatsValues {
    name
    count
  }
`);

function ClientRow({
  selected,
  onSelect,
  style,
  ...props
}: {
  client: FragmentType<typeof ClientRow_ClientStatsValuesFragment>;
  clientOperationStats:
    | FragmentType<typeof ClientRow_ClientStatsValuesFragment>
    | false
    | undefined;
  selected: boolean;
  onSelect(id: string, selected: boolean): void;
  style: any;
}): ReactElement {
  const client = useFragment(ClientRow_ClientStatsValuesFragment, props.client);
  const clientOperation = useFragment(
    ClientRow_ClientStatsValuesFragment,
    props.clientOperationStats || null,
  );
  const requests = useFormattedNumber(client.count);
  const hash = client.name;
  const change = useCallback(() => {
    if (hash) {
      onSelect(hash, !selected);
    }
  }, [onSelect, hash, selected]);

  const Totals = () => {
    if (props.clientOperationStats !== false) {
      return (
        <div className="flex shrink-0 text-right text-gray-500">
          <span>{clientOperation?.count ?? 0}</span>
          <span className="ml-1 truncate text-gray-600">/ {requests}</span>
        </div>
      );
    }
    return <div className="shrink-0 text-right text-gray-600">{requests}</div>;
  };

  return (
    <div style={style} className="flex items-center gap-4 truncate">
      <Checkbox checked={selected} onCheckedChange={change} id={hash} />
      <label
        htmlFor={hash}
        className="flex w-full cursor-pointer items-center justify-between gap-4 overflow-hidden"
      >
        <span className="grow overflow-hidden text-ellipsis">{client.name}</span>
        <Totals />
      </label>
    </div>
  );
}

const ClientsFilter_ClientStatsValuesConnectionFragment = graphql(`
  fragment ClientsFilter_ClientStatsValuesConnectionFragment on ClientStatsValuesConnection {
    edges {
      node {
        name
        ...ClientRow_ClientStatsValuesFragment
      }
    }
  }
`);

function ClientsFilter({
  onClose,
  isOpen,
  onFilter,
  clientStatsConnection,
  operationStatsConnection,
  selected,
}: {
  onClose(): void;
  onFilter(keys: string[]): void;
  isOpen: boolean;
  clientStatsConnection: FragmentType<typeof ClientsFilter_ClientStatsValuesConnectionFragment>;
  operationStatsConnection?:
    | FragmentType<typeof ClientsFilter_ClientStatsValuesConnectionFragment>
    | undefined;
  selected?: string[];
}): ReactElement {
  const clientConnection = useFragment(
    ClientsFilter_ClientStatsValuesConnectionFragment,
    clientStatsConnection,
  );
  function getClientNames() {
    return clientConnection.edges.map(edge => edge.node.name);
  }

  const [selectedItems, setSelectedItems] = useState<string[]>(() =>
    getClientNames().filter(name => selected?.includes(name) ?? true),
  );

  const onSelect = useCallback(
    (operationHash: string, selected: boolean) => {
      const itemAt = selectedItems.findIndex(hash => hash === operationHash);
      const exists = itemAt > -1;

      if (selected && !exists) {
        setSelectedItems([...selectedItems, operationHash]);
      } else if (!selected && exists) {
        setSelectedItems(selectedItems.filter(hash => hash !== operationHash));
      }
    },
    [selectedItems, setSelectedItems],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedFilter = useDebouncedCallback((value: string) => {
    setVisibleOperations(
      clientConnection.edges.filter(edge =>
        edge.node.name.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
      ),
    );
  }, 500);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;

      setSearchTerm(value);
      debouncedFilter(value);
    },
    [setSearchTerm, debouncedFilter],
  );

  const [visibleOperations, setVisibleOperations] = useState(clientConnection.edges);

  const selectAll = useCallback(() => {
    setSelectedItems(getClientNames());
  }, [clientConnection.edges]);
  const selectNone = useCallback(() => {
    setSelectedItems([]);
  }, [setSelectedItems]);

  const operationConnection = useFragment(
    ClientsFilter_ClientStatsValuesConnectionFragment,
    operationStatsConnection ?? null,
  );

  const renderRow = useCallback<ComponentType<ListChildComponentProps>>(
    ({ index, style }) => {
      const client = visibleOperations[index].node;
      const operationStats =
        operationConnection == null
          ? false
          : operationConnection.edges.find(e => e.node.name === client.name)?.node;

      return (
        <ClientRow
          style={style}
          key={client.name}
          client={client}
          clientOperationStats={operationStats}
          selected={selectedItems.includes(client.name || '')}
          onSelect={onSelect}
        />
      );
    },
    [visibleOperations, selectedItems, onSelect, operationConnection],
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Filter by client</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col space-y-3 py-4">
          <Input
            size="medium"
            placeholder="Search for operation..."
            onChange={onChange}
            value={searchTerm}
            onClear={() => {
              setSearchTerm('');
              setVisibleOperations(clientConnection.edges);
            }}
          />
          <div className="flex w-full items-center gap-2">
            <Button variant="link" onClick={selectAll}>
              All
            </Button>
            <Button variant="link" onClick={selectNone}>
              None
            </Button>
            <Button className="ml-auto" onClick={selectAll}>
              Reset
            </Button>
            <Button
              variant="primary"
              disabled={selectedItems.length === 0}
              onClick={() => {
                onFilter(selectedItems);
                onClose();
              }}
            >
              Save
            </Button>
          </div>
          <div className="grow pl-1">
            {operationStatsConnection && (
              <div className="text-right text-xs text-gray-600">
                <span className="text-gray-500">selected</span> / all operations
              </div>
            )}
            <AutoSizer>
              {({ height, width }) =>
                !height || !width ? (
                  <></>
                ) : (
                  <FixedSizeList
                    height={height}
                    width={width}
                    itemCount={visibleOperations.length}
                    itemSize={24}
                    overscanCount={5}
                  >
                    {renderRow}
                  </FixedSizeList>
                )
              }
            </AutoSizer>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ClientsFilterContainer_ClientStatsQuery = graphql(`
  query ClientsFilterContainer_ClientStats(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $filter: OperationStatsFilterInput
    $hasFilter: Boolean!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      operationsStats(period: $period) {
        clients {
          ...ClientsFilter_ClientStatsValuesConnectionFragment
          edges {
            node {
              __typename
            }
          }
        }
      }
      filteredOperationStats: operationsStats(period: $period, filter: $filter)
        @include(if: $hasFilter) {
        clients {
          ...ClientsFilter_ClientStatsValuesConnectionFragment
          edges {
            node {
              __typename
            }
          }
        }
      }
    }
  }
`);

function ClientsFilterContainer({
  period,
  isOpen,
  onClose,
  onFilter,
  selected,
  selectedOperationIds,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  onFilter(keys: string[]): void;
  onClose(): void;
  isOpen: boolean;
  period: DateRangeInput;
  selected?: string[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  selectedOperationIds?: string[];
}): ReactElement | null {
  const [query, refresh] = useQuery({
    query: ClientsFilterContainer_ClientStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      period,
      filter: selectedOperationIds ? { operationIds: selectedOperationIds } : undefined,
      hasFilter: !!selectedOperationIds?.length,
    },
  });

  useEffect(() => {
    if (!query.fetching) {
      refresh({ requestPolicy: 'network-only' });
    }
  }, [period]);

  if (!isOpen) {
    return null;
  }

  if (query.fetching || query.error || !query.data?.target) {
    return <Spinner />;
  }

  const allClients = query.data.target?.operationsStats?.clients.edges ?? [];

  return (
    <ClientsFilter
      clientStatsConnection={query.data.target.operationsStats.clients}
      operationStatsConnection={query.data.target.filteredOperationStats?.clients}
      selected={selected}
      isOpen={isOpen}
      onClose={onClose}
      onFilter={clientNames => {
        onFilter(clientNames.length === allClients.length ? [] : clientNames);
      }}
    />
  );
}

export function ClientsFilterTrigger({
  period,
  onFilter,
  selected,
  organizationSlug,
  projectSlug,
  targetSlug,
  selectedOperationIds,
}: {
  period: DateRangeInput;
  onFilter(keys: string[]): void;
  selected?: string[];
  selectedOperationIds?: string[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const [isOpen, toggle] = useToggle();

  return (
    <>
      <Button variant="outline" className="bg-accent" onClick={toggle}>
        <span>Clients ({selected?.length || 'all'})</span>
        <FilterIcon className="ml-2 size-4" />
      </Button>
      <ClientsFilterContainer
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        isOpen={isOpen}
        onClose={toggle}
        period={period}
        selected={selected}
        selectedOperationIds={selectedOperationIds}
        onFilter={onFilter}
      />
    </>
  );
}
