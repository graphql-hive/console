import { ChangeEvent, ReactElement, useCallback, useMemo, useRef } from 'react';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';
import { Separator } from '@/components/base/separator/separator';
import { ResourceCard } from '@/components/common/resource-card';
import { LayoutContent } from '@/components/layouts/layout-content';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { subDays } from '@/lib/date-time';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { UTCDate } from '@date-fns/utc';
import { getRouteApi, Link, useRouter } from '@tanstack/react-router';

const projectIndexRoute = getRouteApi('/authenticated/with-header/$organizationSlug/$projectSlug/');

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
}): ReactElement => {
  const { organizationSlug, projectSlug } = useSlugs('project');
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
          disabled={organizationSlug == null || projectSlug == null || target?.slug == null}
          params={{
            organizationSlug: organizationSlug ?? 'unknown-yet',
            projectSlug: projectSlug ?? 'unknown-yet',
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

const ProjectsPageContent = (props: RouteSearchProps) => {
  const { organizationSlug, projectSlug } = useSlugs('project');
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
  const navigate = projectIndexRoute.useNavigate();

  const [query] = useQuery({
    query: ProjectOverviewPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
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
      void navigate({
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
      void navigate({
        search(params) {
          return {
            ...params,
            sortBy: value as RouteSearchProps['sortBy'],
          };
        },
      });
    },
    [router],
  );

  const onSortClick = useCallback(() => {
    void navigate({
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
        organizationSlug={organizationSlug}
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
          <div className="flex flex-row items-center gap-x-4">
            <div className="w-full md:w-[200px] lg:w-[336px]">
              <Input
                type="search"
                placeholder="Search..."
                defaultValue={props.search}
                onChange={onSearchChange}
                leadingIcon={SearchIcon}
              />
            </div>
            <Separator orientation="vertical" />
            <Select
              aria-label="Sort targets by"
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
            <Button
              variant="outline"
              layout="iconOnly"
              icon={props.sortOrder === 'asc' ? MoveUpIcon : MoveDownIcon}
              aria-label={props.sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
              onClick={onSortClick}
            />
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

export function ProjectPage(props: RouteSearchProps): ReactElement {
  return (
    <>
      <Meta title="Targets" />
      <LayoutContent className="flex justify-between gap-12">
        <ProjectsPageContent
          search={props.search}
          sortBy={props.sortBy}
          sortOrder={props.sortOrder}
        />
      </LayoutContent>
    </>
  );
}
