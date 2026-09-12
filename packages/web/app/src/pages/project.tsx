import { ChangeEvent, ReactElement, useCallback, useMemo, useRef } from 'react';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { z } from 'zod';
import { Select } from '@/components/base/floating/select/select';
import { ResourceCard } from '@/components/common/resource-card';
import { Page, ProjectLayout } from '@/components/layouts/project';
import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Separator } from '@/components/ui/separator';
import { FragmentType, graphql, useFragment } from '@/gql';
import { subDays } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { UTCDate } from '@date-fns/utc';
import { Link, useRouter } from '@tanstack/react-router';

const TargetCard_TargetFragment = graphql(`
  fragment TargetCard_TargetFragment on Target {
    id
    slug
  }
`);

const TargetCard = (props: {
  target: FragmentType<typeof TargetCard_TargetFragment> | null;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
  organizationSlug: string;
  projectSlug: string;
}): ReactElement => {
  const target = useFragment(TargetCard_TargetFragment, props.target);

  return (
    <ResourceCard
      kind="target"
      name={target?.slug ?? null}
      highestNumberOfRequests={props.highestNumberOfRequests}
      requestsOverTime={props.requestsOverTime}
      schemaVersionsCount={props.schemaVersionsCount}
      days={props.days}
      renderLink={children => (
        <Link
          className="block pb-5 pt-4"
          to="/$organizationSlug/$projectSlug/$targetSlug"
          disabled={
            props.organizationSlug == null || props.projectSlug == null || target?.slug == null
          }
          params={{
            organizationSlug: props.organizationSlug ?? 'unknown-yet',
            projectSlug: props.projectSlug ?? 'unknown-yet',
            targetSlug: target?.slug ?? 'unknown-yet',
          }}
        >
          {children}
        </Link>
      )}
    />
  );
};

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

  const sortOrder =
    props.sortOrder === 'asc'
      ? -1
      : // if the sort order is not set, sort by name in ascending order by default
        !props.sortOrder && props.sortBy === 'name'
        ? -1
        : // if the sort order is not set, sort in descending order by default
          1;
  const router = useRouter();

  const [query] = useQuery({
    query: ProjectOverviewPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      chartResolution: days, // 14 days = 14 data points
      period: period.current,
    },
    requestPolicy: 'cache-and-network',
  });

  const targetConnection = query.data?.targets;

  const targets = useMemo(() => {
    if (!targetConnection) {
      return [];
    }

    const searchPhrase = props.search;
    const newTargets = searchPhrase
      ? targetConnection.edges.filter(edge =>
          edge.node.slug.toLowerCase().includes(searchPhrase.toLowerCase()),
        )
      : targetConnection.edges.slice();

    return newTargets
      .map(edge => edge.node)
      .sort((a, b) => {
        const diffRequests = b.totalRequests - a.totalRequests;
        const diffVersions = b.schemaVersionsCount - a.schemaVersionsCount;

        if (sortKey === 'requests' && diffRequests !== 0) {
          return diffRequests * sortOrder;
        }

        if (sortKey === 'versions' && diffVersions !== 0) {
          return diffVersions * sortOrder;
        }

        if (sortKey === 'name') {
          return a.slug.localeCompare(b.slug) * sortOrder * -1;
        }

        // falls back to sort by name in ascending order
        return a.slug.localeCompare(b.slug);
      });
  }, [targetConnection, props.search, sortKey, sortOrder]);

  const highestNumberOfRequests = useMemo(() => {
    if (targetConnection?.edges?.length) {
      return targetConnection.edges.reduce((max, edge) => {
        return Math.max(
          max,
          edge.node.requestsOverTime.reduce((max, { value }) => Math.max(max, value), 0),
        );
      }, 100);
    }

    return 100;
  }, [targetConnection?.edges]);

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
                className="dark:bg-neutral-3 bg-neutral-2 h-9 w-full rounded-lg pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <Separator orientation="vertical" className="mx-4 h-8" />
            <Select
              options={[
                {
                  value: 'requests',
                  label: 'Requests',
                  description: `GraphQL requests made in the last ${days} days.`,
                },
                {
                  value: 'versions',
                  label: 'Schema Versions',
                  description: `Schemas published in last ${days} days.`,
                },
                { value: 'name', label: 'Name', description: 'Sort by target name.' },
              ]}
              value={props.sortBy ?? 'requests'}
              onValueChange={onRequestsValueChange}
            />
            <Button className="size-9 shrink-0" variant="outline" size="icon" onClick={onSortClick}>
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
          targetConnection?.edges.length === 0
            ? ''
            : 'grid grid-cols-2 items-stretch gap-5 xl:grid-cols-3',
        )}
      >
        {targetConnection ? (
          targetConnection?.edges.length === 0 ? (
            <EmptyList
              title="Hive is waiting for your first target"
              description='You can create a target by clicking the "New Target" button'
              docsUrl="/schema-registry/management/targets#create-a-new-target"
            />
          ) : (
            targets.map(target => (
              <TargetCard
                key={target.id}
                target={target}
                days={days}
                highestNumberOfRequests={highestNumberOfRequests}
                requestsOverTime={target.requestsOverTime}
                schemaVersionsCount={target.schemaVersionsCount}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
              />
            ))
          )
        ) : (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <TargetCard
                key={index}
                target={null}
                days={days}
                highestNumberOfRequests={highestNumberOfRequests}
                requestsOverTime={null}
                schemaVersionsCount={null}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
              />
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
  ) {
    targets(selector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug }) {
      edges {
        node {
          id
          slug
          ...TargetCard_TargetFragment
          totalRequests(period: $period)
          requestsOverTime(resolution: $chartResolution, period: $period) {
            date
            value
          }
          schemaVersionsCount(period: $period)
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
