import { ReactNode, useMemo } from 'react';
import { useRouter } from 'next/router';
import { RefreshCw } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Autocomplete } from '@/components/v2';
import { graphql } from '@/gql';
import { useArgumentListToggle, usePeriodSelector } from './provider';

const SchemaExplorerFilter_AllTypes = graphql(`
  query SchemaExplorerFilter_AllTypes(
    $organization: ID!
    $project: ID!
    $target: ID!
    $period: DateRangeInput!
  ) {
    target(selector: { organization: $organization, project: $project, target: $target }) {
      __typename
      id
      latestSchemaVersion {
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

export function SchemaExplorerFilter({
  organization,
  project,
  target,
  period,
  typename,
  children,
}: {
  typename?: string;
  children?: ReactNode;
  organization: { cleanId: string };
  project: { cleanId: string };
  target: { cleanId: string };
  period: {
    to: string;
    from: string;
  };
}) {
  const [collapsed, toggleCollapsed] = useArgumentListToggle();
  const router = useRouter();
  const [query] = useQuery({
    query: SchemaExplorerFilter_AllTypes,
    variables: {
      organization: organization.cleanId,
      project: project.cleanId,
      target: target.cleanId,
      period,
    },
    requestPolicy: 'cache-first',
  });
  const periodSelector = usePeriodSelector();

  const allNamedTypes = query.data?.target?.latestSchemaVersion?.explorer?.types;
  const types = useMemo(
    () =>
      allNamedTypes?.map(t => ({
        value: t.name,
        label: t.name,
      })) || [],
    [allNamedTypes],
  );

  return (
    <div className="flex flex-row items-center gap-x-4">
      <Input
        className="w-[200px] grow cursor-text"
        placeholder="Filter by field name"
        onChange={e => {
          if (e.target.value === '') {
            const routerQuery = router.query;
            delete routerQuery.search;
            void router.push({ query: routerQuery }, undefined, { shallow: true });
            return;
          }

          void router.push(
            {
              query: {
                ...router.query,
                search: e.target.value === '' ? undefined : e.target.value,
              },
            },
            undefined,
            { shallow: true },
          );
        }}
        value={typeof router.query.search === 'string' ? router.query.search : ''}
      />
      <Autocomplete
        className="min-w-[200px] grow cursor-text"
        placeholder="Search for a type"
        defaultValue={typename ? { value: typename, label: typename } : null}
        options={types}
        onChange={option => {
          void router.push(
            `/${organization.cleanId}/${project.cleanId}/${target.cleanId}/explorer/${option.value}`,
          );
        }}
        loading={query.fetching}
      />
      <DateRangePicker
        validUnits={['y', 'M', 'w', 'd', 'h']}
        onUpdate={value => {
          periodSelector.setPeriod(value.preset.range);
        }}
        selectedRange={periodSelector.period}
        startDate={periodSelector.startDate}
        align="end"
      />
      <Button variant="outline" onClick={() => periodSelector.refreshResolvedPeriod()}>
        <RefreshCw className="size-4" />
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="bg-secondary flex h-[40px] flex-row items-center gap-x-4 rounded-md border px-3">
              <div>
                <Label htmlFor="filter-toggle-arguments" className="text-sm font-normal">
                  Display all arguments
                </Label>
                {/* <div className="text-xs text-gray-500">Collapsed by default</div> */}
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
      {children}
    </div>
  );
}
