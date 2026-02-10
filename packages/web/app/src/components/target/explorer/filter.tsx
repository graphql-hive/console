import React, { ChangeEvent, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { FilterIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Autocomplete } from '@/components/v2';
import type { SelectOption } from '@/components/v2/radix-select';
import { graphql } from '@/gql';
import {
  Link,
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import {
  useDescriptionsVisibleToggle,
  usePeriodSelector,
  useSchemaExplorerContext,
} from './provider';

const ServiceNameFilter_ServiceNames = graphql(`
  query ServiceNameFilter_ServiceNames(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      __typename
      id
      latestValidSchemaVersion {
        __typename
        id
        explorer(usage: { period: $period }) {
          types {
            __typename
            supergraphMetadata {
              ownedByServiceNames
            }
            ... on GraphQLObjectType {
              fields {
                supergraphMetadata {
                  ownedByServiceNames
                }
              }
            }
            ... on GraphQLInterfaceType {
              fields {
                supergraphMetadata {
                  ownedByServiceNames
                }
              }
            }
            ... on GraphQLInputObjectType {
              fields {
                supergraphMetadata {
                  ownedByServiceNames
                }
              }
            }
          }
        }
      }
    }
  }
`);

const TypeFilter_AllTypes = graphql(`
  query TypeFilter_AllTypes(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      __typename
      id
      latestValidSchemaVersion {
        __typename
        id
        explorer(usage: { period: $period }) {
          types {
            __typename
            ... on GraphQLObjectType {
              name
            }
            ... on GraphQLInterfaceType {
              name
            }
            ... on GraphQLUnionType {
              name
            }
            ... on GraphQLEnumType {
              name
            }
            ... on GraphQLInputObjectType {
              name
            }
            ... on GraphQLScalarType {
              name
            }
          }
        }
      }
    }
  }
`);

export function TypeFilter(props: {
  typename?: string;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  period: {
    to: string;
    from: string;
  };
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const deferredInputValue = useDeferredValue(inputValue);
  const [query] = useQuery({
    query: TypeFilter_AllTypes,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      period: props.period,
    },
    requestPolicy: 'cache-first',
  });

  const allNamedTypes = query.data?.target?.latestValidSchemaVersion?.explorer?.types;
  const types = useMemo(
    () =>
      allNamedTypes?.map(t => ({
        value: t.name,
        label: t.name,
      })) || [],
    [allNamedTypes],
  );

  const sortedTypes = useMemo(() => {
    if (!deferredInputValue) return types;

    const search = deferredInputValue.toLowerCase();
    return [...types].sort((a, b) => {
      const aName = a.label.toLowerCase();
      const bName = b.label.toLowerCase();

      // Exact match gets highest priority
      const aExact = aName === search;
      const bExact = bName === search;
      if (aExact !== bExact) return aExact ? -1 : 1;

      // Prefix match gets second priority
      const aPrefix = aName.startsWith(search);
      const bPrefix = bName.startsWith(search);
      if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;

      // Alphabetical within same relevance
      return aName.localeCompare(bName);
    });
  }, [types, deferredInputValue]);

  const onChange = useCallback(
    (option: SelectOption | null) => {
      void router.navigate({
        search: router.latestLocation.search,
        to: '/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
          typename: option?.value ?? '',
        },
      });
    },
    [router],
  );

  const defaultValue = useMemo(() => {
    return props.typename ? { value: props.typename, label: props.typename } : null;
  }, [props.typename]);

  return (
    <Autocomplete
      className="min-w-[200px] grow cursor-text"
      placeholder="Search for a type"
      defaultValue={defaultValue}
      options={sortedTypes}
      onChange={onChange}
      onInputChange={setInputValue}
      loading={query.fetching}
    />
  );
}

export function FieldByNameFilter() {
  const router = useRouter();

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      void router.navigate({
        search: {
          ...router.latestLocation.search,
          search: e.target.value === '' ? undefined : e.target.value,
        },
        replace: true,
      });
    },
    [router],
  );

  const initialValue =
    'search' in router.latestLocation.search &&
    typeof router.latestLocation.search.search === 'string'
      ? router.latestLocation.search.search
      : '';

  return (
    <Input
      className="w-[200px] grow cursor-text"
      placeholder="Filter by field name"
      onChange={onChange}
      defaultValue={initialValue}
    />
  );
}

export function DateRangeFilter() {
  const periodSelector = usePeriodSelector();
  const onUpdate = useCallback(
    (value: { preset: { range: { from: string; to: string } } }) => {
      periodSelector.setPeriod(value.preset.range);
    },
    [periodSelector],
  );

  return (
    <DateRangePicker
      validUnits={['y', 'M', 'w', 'd']}
      onUpdate={onUpdate}
      selectedRange={periodSelector.period}
      startDate={periodSelector.startDate}
      align="end"
    />
  );
}

export function ServiceNameFilter(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  period: {
    to: string;
    from: string;
  };
  metadataAttributes?: Array<{ name: string; values: string[] }> | null;
}) {
  const { setMetadataFilter, unsetMetadataFilter, hasMetadataFilter } =
    useSchemaExplorerContext();

  // Query to get service names from types
  const [query] = useQuery({
    query: ServiceNameFilter_ServiceNames,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      period: props.period,
    },
    requestPolicy: 'cache-first',
  });

  const serviceNames = useMemo(() => {
    const allTypes = query.data?.target?.latestValidSchemaVersion?.explorer?.types;
    if (!allTypes) return [];

    const serviceNameSet = new Set<string>();

    for (const type of allTypes) {
      // Add service names from type-level metadata
      if (type.supergraphMetadata?.ownedByServiceNames) {
        for (const serviceName of type.supergraphMetadata.ownedByServiceNames) {
          serviceNameSet.add(serviceName);
        }
      }

      // Add service names from field-level metadata
      if ('fields' in type && Array.isArray(type.fields)) {
        for (const field of type.fields) {
          if (field.supergraphMetadata?.ownedByServiceNames) {
            for (const serviceName of field.supergraphMetadata.ownedByServiceNames) {
              serviceNameSet.add(serviceName);
            }
          }
        }
      }
    }

    const extracted = Array.from(serviceNameSet).sort();

    return extracted;
  }, [query.data]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="data-[state=open]:bg-muted">
          <FilterIcon className="size-4" />
          &nbsp;Service
          <span className="sr-only">Open menu to filter by service name.</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[300px] min-w-[160px] max-w-[300px] flex-wrap overflow-y-auto"
      >
        {serviceNames.length > 0 ? (
          serviceNames.map(serviceName => (
            <DropdownMenuCheckboxItem
              key={serviceName}
              className="w-full"
              checked={hasMetadataFilter('service', serviceName)}
              onCheckedChange={isChecked => {
                if (isChecked) {
                  setMetadataFilter('service', serviceName);
                } else {
                  unsetMetadataFilter('service', serviceName);
                }
              }}
            >
              {serviceName}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuCheckboxItem disabled>
            No services found in metadata
          </DropdownMenuCheckboxItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DescriptionsVisibilityFilter() {
  const { isDescriptionsVisible, toggleDescriptionsVisible } = useDescriptionsVisibleToggle();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-neutral-2 flex h-[40px] flex-row items-center gap-x-4 rounded-md border px-3">
            <div>
              <Label htmlFor="filter-toggle-descriptions" className="text-sm font-normal">
                Show descriptions
              </Label>
            </div>
            <Switch
              checked={isDescriptionsVisible}
              onCheckedChange={toggleDescriptionsVisible}
              id="filter-toggle-descriptions"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Descriptions are not visible by default. You can toggle this setting to display all
          descriptions.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const variants: Array<{
  value: 'all' | 'unused' | 'deprecated';
  label: string;
  pathname: ToPathOption<RegisteredRouter, RoutePaths<RegisteredRouter['routeTree']>, ''>;
  tooltip: string;
}> = [
  {
    value: 'all',
    label: 'All',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer',
    tooltip: 'Shows all types, including unused and deprecated ones',
  },
  {
    value: 'unused',
    label: 'Unused',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/unused',
    tooltip: 'Shows only types that are not used in any operation',
  },
  {
    value: 'deprecated',
    label: 'Deprecated',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
    tooltip: 'Shows only types that are marked as deprecated',
  },
];

export function SchemaVariantFilter(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  variant: 'all' | 'unused' | 'deprecated';
}) {
  const { search } = useLocation();
  return (
    <TooltipProvider>
      <Tabs defaultValue={props.variant}>
        <TabsList className="bg-neutral-5">
          {variants.map(variant => (
            <Tooltip key={variant.value}>
              <TooltipTrigger asChild>
                {props.variant === variant.value ? (
                  <div>
                    <TabsTrigger
                      className="dark:data-[state=active]:bg-neutral-7 data-[state=active]:text-neutral-12"
                      value={variant.value}
                    >
                      {variant.label}
                    </TabsTrigger>
                  </div>
                ) : (
                  <TabsTrigger
                    className="text-neutral-9 hover:text-neutral-11"
                    value={variant.value}
                    asChild
                  >
                    <Link
                      to={variant.pathname}
                      params={{
                        organizationSlug: props.organizationSlug,
                        projectSlug: props.projectSlug,
                        targetSlug: props.targetSlug,
                      }}
                      search={search}
                    >
                      {variant.label}
                    </Link>
                  </TabsTrigger>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">{variant.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>
    </TooltipProvider>
  );
}

function preventTheDefault(e: { preventDefault(): void }) {
  e.preventDefault();
}

export function MetadataFilter(props: { options: Array<{ name: string; values: string[] }> }) {
  const {
    setMetadataFilter,
    unsetMetadataFilter,
    hasMetadataFilter,
    bulkSetMetadataFilter,
    clearMetadataFilter,
  } = useSchemaExplorerContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="data-[state=open]:bg-neutral-3">
          <FilterIcon className="size-4" />
          &nbsp;Metadata
          <span className="sr-only">Open menu to filter by metadata.</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[300px] min-w-[160px] max-w-[300px] flex-wrap overflow-y-auto"
      >
        {props.options.map(({ name, values }, i) => (
          <React.Fragment key={name}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup
              className="text-neutral-10 flex cursor-pointer overflow-x-hidden text-sm hover:underline"
              onClick={() => {
                const isChecked = !values.every(value => hasMetadataFilter(name, value));
                if (isChecked) {
                  bulkSetMetadataFilter([props.options[i]]);
                } else {
                  clearMetadataFilter(name);
                }
              }}
            >
              {name}
            </DropdownMenuGroup>
            {values.map(v => {
              const id = `${name}:${v}`;
              return (
                <DropdownMenuCheckboxItem
                  onSelect={preventTheDefault}
                  key={id}
                  className="w-full"
                  checked={hasMetadataFilter(name, v)}
                  onCheckedChange={isChecked => {
                    if (isChecked) {
                      setMetadataFilter(name, v);
                    } else {
                      unsetMetadataFilter(name, v);
                    }
                  }}
                >
                  {v}
                </DropdownMenuCheckboxItem>
              );
            })}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
