import { ChangeEvent, ReactElement, useCallback, useMemo, useRef } from 'react';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { z } from 'zod';
import { Page, ProjectLayout } from '@/components/layouts/project';
import {
  TargetCard,
  TargetCardFragment,
  TargetCardSkeleton,
} from '@/components/organization/TargetCard';
import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FragmentType, graphql, useFragment } from '@/gql';
import { TargetsSortDirectionType, TargetsSortFieldType } from '@/gql/graphql';
import { subDays } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { UTCDate } from '@date-fns/utc';
import { useRouter } from '@tanstack/react-router';

export const ProjectIndexRouteSearch = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['requests', 'versions', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type RouteSearchProps = z.infer<typeof ProjectIndexRouteSearch>;

const ProjectsPageContent = (
  props: { organizationSlug: string; projectSlug: string } & RouteSearchProps,
) => {
  const period = useRef<{
    from: string;
    to: string;
  }>();
  const days = 14;

  if (!period.current) {
    const now = new UTCDate();
    const from = formatISO(startOfDay(subDays(now, days)));
    const to = formatISO(endOfDay(now));

    period.current = { from, to };
  }

  // Sort by requests by default
  const sortKey = props.sortBy ?? 'requests';

  const sortOrder: 'asc' | 'desc' =
    props.sortOrder === 'asc'
      ? 'asc'
      : // if the sort order is not set, sort by name in ascending order by default
        !props.sortOrder && props.sortBy === 'name'
        ? 'asc'
        : // if the sort order is not set, sort in descending order by default
          'desc';

  const sort = useMemo(() => {
    let field: TargetsSortFieldType = TargetsSortFieldType.Name;
    let direction: TargetsSortDirectionType = TargetsSortDirectionType.Asc;

    if (sortKey === 'requests') {
      field = TargetsSortFieldType.Requests;
    } else if (sortKey === 'versions') {
      field = TargetsSortFieldType.SchemaVersions;
    }

    if (sortOrder === 'desc') {
      direction = TargetsSortDirectionType.Desc;
    }

    return { field, direction, period: period.current };
  }, [sortKey, sortOrder, period.current]);

  const router = useRouter();

  const [query] = useQuery({
    query: ProjectOverviewPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      chartResolution: days, // 14 days = 14 data points
      period: period.current,
      sort,
      search: props.search,
    },
    requestPolicy: 'cache-and-network',
  });

  const targets = query.data?.targets.edges.map(edge => edge.node);
  const targetCardData = useFragment(TargetCardFragment, targets);

  const highestNumberOfRequests = useMemo(() => {
    if (targetCardData?.length) {
      return targetCardData.reduce((max, target) => {
        return Math.max(
          max,
          target.operationsStats?.requestsOverTime?.reduce(
            (max, { value }) => Math.max(max, value),
            0,
          ) ?? 0,
        );
      }, 100);
    }

    return 100;
  }, [targets]);

  const onSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void router.navigate({
        search(params) {
          return {
            ...params,
            search: event.target.value,
          };
        },
        replace: true,
      });
    },
    [router],
  );

  const onRequestsValueChange = useCallback(
    (value: string) => {
      void router.navigate({
        search(params) {
          return {
            ...params,
            sortBy: value,
          };
        },
      });
    },
    [router],
  );

  const onSortClick = useCallback(() => {
    void router.navigate({
      search(params) {
        return {
          ...params,
          sortOrder: props.sortOrder === 'asc' ? 'desc' : 'asc',
        };
      },
    });
  }, [router, props.sortOrder]);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <div className="grow">
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <Title>Targets</Title>
          <Subtitle>A list of available targets in your project.</Subtitle>
        </div>
        <div>
          <div className="flex flex-row items-center gap-x-2">
            <div className="relative">
              <SearchIcon className="text-neutral-10 absolute left-2.5 top-2.5 size-4" />
              <Input
                type="search"
                placeholder="Search..."
                defaultValue={props.search}
                onChange={onSearchChange}
                className="dark:bg-neutral-3 bg-neutral-2 w-full rounded-lg pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <Separator orientation="vertical" className="mx-4 h-8" />
            <Select value={props.sortBy ?? 'requests'} onValueChange={onRequestsValueChange}>
              <SelectTrigger className="hover:bg-neutral-2 bg-transparent">
                {props.sortBy === 'versions'
                  ? 'Schema Versions'
                  : props.sortBy === 'name'
                    ? 'Name'
                    : 'Requests'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requests">
                  <div className="font-medium">Requests</div>
                  <div className="text-neutral-10 text-xs">
                    GraphQL requests made in the last {days} days.
                  </div>
                </SelectItem>
                <SelectItem value="versions">
                  <div className="font-medium">Schema Versions</div>
                  <div className="text-neutral-10 text-xs">
                    Schemas published in last {days} days.
                  </div>
                </SelectItem>
                <SelectItem value="name">
                  <div className="font-medium">Name</div>
                  <div className="text-neutral-10 text-xs">Sort by target name.</div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button className="shrink-0" variant="outline" size="icon" onClick={onSortClick}>
              {props.sortOrder === 'asc' ? (
                <MoveUpIcon className="size-4" />
              ) : (
                <MoveDownIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'grow',
          targets?.length === 0
            ? ''
            : 'grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] items-stretch gap-5',
        )}
      >
        {targets ? (
          targets?.length === 0 ? (
            <EmptyList
              title="Hive is waiting for your first target"
              description='You can create a target by clicking the "New Target" button'
              docsUrl="/schema-registry/management/targets#create-a-new-target"
            />
          ) : (
            targets.map(target => (
              <TargetCard
                key={target.id}
                id={target.id}
                slug={target.slug}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                days={days}
                highestNumberOfRequests={highestNumberOfRequests}
                data={target as FragmentType<typeof TargetCardFragment>}
              />
            ))
          )
        ) : (
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <TargetCardSkeleton key={index} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const ProjectOverviewPageQuery = graphql(`
  query ProjectOverviewPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $chartResolution: Int!
    $period: DateRangeInput!
    $sort: TargetsSortInput!
    $search: String
  ) {
    targets(
      selector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug }
      sort: $sort
      search: $search
    ) {
      edges {
        node {
          id
          slug
          ...TargetCardFragment
        }
      }
    }
  }
`);

export function ProjectPage(
  props: { organizationSlug: string; projectSlug: string } & RouteSearchProps,
): ReactElement {
  return (
    <>
      <Meta title="Targets" />
      <ProjectLayout
        page={Page.Targets}
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        className="flex justify-between gap-12"
      >
        <ProjectsPageContent
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          search={props.search}
          sortBy={props.sortBy}
          sortOrder={props.sortOrder}
        />
      </ProjectLayout>
    </>
  );
}
