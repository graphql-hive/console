import { useMemo } from 'react';
import { FilterIcon } from 'lucide-react';
import { useQuery } from 'urql';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Autocomplete } from '@/components/v2';
import { graphql } from '@/gql';
import {
  Link,
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { useArgumentListToggle, usePeriodSelector, useSchemaExplorerContext } from './provider';

const TypeFilter_AllTypes = graphql(`
  query TypeFilter_AllTypes(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
  ) {
    target(
      selector: {
        organizationSlug: $organizationSlug
        projectSlug: $projectSlug
        targetSlug: $targetSlug
      }
    ) {
      __typename
      id
      latestValidSchemaVersion {
        __typename
        id
        valid
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

  return (
    <Autocomplete
      className="min-w-[200px] grow cursor-text"
      placeholder="Search for a type"
      defaultValue={props.typename ? { value: props.typename, label: props.typename } : null}
      options={types}
      onChange={option => {
        void router.navigate({
          to: '/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename',
          params: {
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            typename: option.value,
          },
          search: router.latestLocation.search,
        });
      }}
      loading={query.fetching}
    />
  );
}

export function FieldByNameFilter() {
  const router = useRouter();

  return (
    <Input
      className="w-[200px] grow cursor-text"
      placeholder="Filter by field name"
      onChange={e => {
        void router.navigate({
          search: {
            ...router.latestLocation.search,
            search: e.target.value === '' ? undefined : e.target.value,
          },
        });
      }}
      value={
        'search' in router.latestLocation.search &&
        typeof router.latestLocation.search.search === 'string'
          ? router.latestLocation.search.search
          : ''
      }
    />
  );
}

export function DateRangeFilter() {
  const periodSelector = usePeriodSelector();

  return (
    <DateRangePicker
      validUnits={['y', 'M', 'w', 'd']}
      onUpdate={value => {
        periodSelector.setPeriod(value.preset.range);
      }}
      selectedRange={periodSelector.period}
      startDate={periodSelector.startDate}
      align="end"
    />
  );
}

export function ArgumentVisibilityFilter() {
  const [collapsed, toggleCollapsed] = useArgumentListToggle();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-secondary flex h-[40px] flex-row items-center gap-x-4 rounded-md border px-3">
            <div>
              <Label htmlFor="filter-toggle-arguments" className="text-sm font-normal">
                All arguments
              </Label>
            </div>
            <Switch
              checked={!collapsed}
              onCheckedChange={toggleCollapsed}
              id="filter-toggle-arguments"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          List of arguments is collapsed by default. You can toggle this setting to display all
          arguments.
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
  const { search } = useLocation()
  return (
    <TooltipProvider>
      <Tabs defaultValue={props.variant}>
        <TabsList>
          {variants.map(variant => (
            <Tooltip key={variant.value}>
              <TooltipTrigger asChild>
                {props.variant === variant.value ? (
                  <div>
                    <TabsTrigger value={variant.value}>{variant.label}</TabsTrigger>
                  </div>
                ) : (
                  <TabsTrigger value={variant.value} asChild>
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
  const { setMetadataFilter, unsetMetadataFilter, hasMetadataFilter, clearMetadataFilter, bulkSetMetadataFilter, metadata } = useSchemaExplorerContext();

  const numOptions = useMemo(
    () =>
      props.options?.reduce((sum, opt) => opt.values.length + sum, 0),
    [props.options],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="data-[state=open]:bg-muted">
          <FilterIcon className="size-4" />&nbsp;Metadata
          <span className="sr-only">Open menu to filter by metadata.</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
      <DropdownMenuCheckboxItem
          onSelect={preventTheDefault}
          className="w-full"
          checked={metadata.length === numOptions}
          onCheckedChange={isChecked => {
            if (isChecked) {
              bulkSetMetadataFilter(props.options);
            } else {
              clearMetadataFilter();
            }
          }}
        >
          Select All
        </DropdownMenuCheckboxItem>
        <Accordion defaultValue={[props.options[0]?.name]} type="multiple">
          {props.options.map(({ name, values }) => (
            <AccordionItem key={name} value={name}>
              <AccordionTrigger className="w-full">{name}</AccordionTrigger>
              <AccordionContent
                onSelect={preventTheDefault}
                className="ml-1 flex max-h-[100%] max-w-[300px] flex-wrap items-start overflow-x-hidden"
              >
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
