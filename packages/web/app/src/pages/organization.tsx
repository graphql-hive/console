import { ChangeEvent, useCallback, useMemo, useRef } from 'react';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { ArrowUpRight, MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { z } from 'zod';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { TargetCard, TargetCardSkeleton } from '@/components/organization/TargetCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { subDays } from '@/lib/date-time';
import { UTCDate } from '@date-fns/utc';
import { Link, useRouter } from '@tanstack/react-router';

export const OrganizationIndexRouteSearch = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['requests', 'versions', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type RouteSearchProps = z.infer<typeof OrganizationIndexRouteSearch>;

const OrganizationProjectsPageQuery = graphql(`
  query OrganizationProjectsPageQuery(
    $organizationSlug: String!
    $period: DateRangeInput!
    $chartResolution: Int!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
            type
            totalRequests(period: $period)
            requestsOverTime(resolution: $chartResolution, period: $period) {
              date
              value
            }
            schemaVersionsCount(period: $period)
            targets {
              edges {
                node {
                  id
                  slug
                  totalRequests(period: $period)
                  schemaVersionsCount(period: $period)
                }
              }
            }
          }
        }
      }
    }
  }
`);

const projectTypeFullNames = {
  [ProjectType.Federation]: 'Apollo Federation',
  [ProjectType.Stitching]: 'Schema Stitching',
  [ProjectType.Single]: 'Monolithic Schema',
};

const ProjectCard = (props: {
  id: string;
  slug: string;
  type: ProjectType;
  highestNumberOfRequests: number;
  totalRequests: number | null;
  schemaVersionsCount: number | null;
  days: number;
  targets:
    | {
        id: string;
        slug: string;
        totalRequests: number;
        schemaVersionsCount: number;
      }[]
    | null;
  organizationSlug: string;
  projectSlug: string;
  sortKey: string;
  sortOrder: number;
}) => {
  const sortedTargets = useMemo(() => {
    if (!props.targets) {
      return [];
    }

    return props.targets.sort((a, b) => {
      const diffRequests = b.totalRequests - a.totalRequests;
      const diffVersions = b.schemaVersionsCount - a.schemaVersionsCount;

      if (props.sortKey === 'requests' && diffRequests !== 0) {
        return diffRequests * props.sortOrder;
      }

      if (props.sortKey === 'versions' && diffVersions !== 0) {
        return diffVersions * props.sortOrder;
      }

      if (props.sortKey === 'name') {
        return a.slug.localeCompare(b.slug) * props.sortOrder * -1;
      }

      // falls back to sort by name in ascending order
      return a.slug.localeCompare(b.slug);
    });
  }, [props.targets, props.sortKey, props.sortOrder]);

  return (
    <TooltipProvider>
      <div className="border-neutral-5 dark:border-neutral-4 bg-neutral-1 dark:bg-neutral-3 overflow-hidden rounded-lg border">
        <Link
          to="/$organizationSlug/$projectSlug"
          params={{ organizationSlug: props.organizationSlug, projectSlug: props.projectSlug }}
          className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden p-4"
        >
          <div className="flex gap-x-2">
            <h4 className="line-clamp-2 text-lg font-medium">{props.slug}</h4>
            <Badge variant="secondary">{projectTypeFullNames[props.type]}</Badge>
          </div>
          <div className="text-neutral-11 flex items-center gap-1 group-hover:underline">
            Open <ArrowUpRight className="size-4" />
          </div>
        </Link>
        <div className="border-t-neutral-5 dark:border-t-neutral-4 divide-neutral-4 dark:divide-neutral-5 -mb-1 -mr-1 grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] divide-x divide-y border-t">
          {sortedTargets?.map(target => (
            <TargetCard
              key={target.id}
              id={target.id}
              slug={target.slug}
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              highestNumberOfRequests={props.highestNumberOfRequests}
              days={props.days}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

const ProjectCardSkeleton = () => {
  return (
    <div className="border-neutral-5 dark:border-neutral-4 bg-neutral-1 dark:bg-neutral-3 overflow-hidden rounded-lg border">
      <div className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden p-4">
        <div className="flex gap-x-2">
          <div className="bg-neutral-2 dark:bg-neutral-5 h-4 w-32 rounded-lg" />
          <Badge variant="secondary" className="w-16" />
        </div>
        <div className="text-neutral-11 flex items-center gap-1 group-hover:underline">
          Open <ArrowUpRight className="size-4" />
        </div>
      </div>
      <div className="border-t-neutral-6 dark:border-t-neutral-5 divide-neutral-4 dark:divide-neutral-5 -mb-1 -mr-1 grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] divide-x divide-y border-t">
        {Array.from({ length: 3 }).map((_, index) => (
          <TargetCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

function OrganizationPageContent(
  props: {
    organizationSlug: string;
  } & RouteSearchProps,
) {
  const days = 14;
  const period = useRef<{
    from: string;
    to: string;
  }>();

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

  if (!period.current) {
    const now = new UTCDate();
    const from = formatISO(startOfDay(subDays(now, days)));
    const to = formatISO(endOfDay(now));

    period.current = { from, to };
  }

  const router = useRouter();

  const [query] = useQuery({
    query: OrganizationProjectsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      chartResolution: days, // 14 days = 14 data points
      period: period.current,
    },
    requestPolicy: 'cache-and-network',
  });

  const currentOrganization = query.data?.organization;
  const projectsConnection = currentOrganization?.projects;

  const highestNumberOfRequests = useMemo(() => {
    let highest = 10;

    if (projectsConnection?.edges.length) {
      for (const edge of projectsConnection.edges) {
        for (const dataPoint of edge.node.requestsOverTime) {
          if (dataPoint.value > highest) {
            highest = dataPoint.value;
          }
        }
      }
    }

    return highest;
  }, [projectsConnection]);

  const projects = useMemo(() => {
    if (!projectsConnection) {
      return [];
    }

    const searchPhrase = props.search;
    const newProjects = searchPhrase
      ? projectsConnection.edges.filter(edge =>
          edge.node.slug.toLowerCase().includes(searchPhrase.toLowerCase()),
        )
      : projectsConnection.edges.slice();

    return newProjects
      .map(project => project.node)
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
  }, [projectsConnection, props.search, sortKey, sortOrder]);

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
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  return (
    <OrganizationLayout
      page={Page.Overview}
      organizationSlug={props.organizationSlug}
      className="flex justify-between gap-12"
    >
      <>
        <div className="grow">
          <div className="flex flex-row items-center justify-between py-6">
            <div>
              <Title>Projects</Title>
              <Subtitle>A list of available project in your organization.</Subtitle>
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
                  <SelectTrigger>
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
                      <div className="text-neutral-10 text-xs">Sort by project name.</div>
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
          {currentOrganization && projectsConnection ? (
            projectsConnection.edges.length === 0 ? (
              <EmptyList
                title="Hive is waiting for your first project"
                description='You can create a project by clicking the "New Project" button'
                docsUrl="/schema-registry/management/projects#create-a-new-project"
              />
            ) : (
              <div className="flex w-full flex-col gap-y-8">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    slug={project.slug}
                    type={project.type}
                    days={days}
                    highestNumberOfRequests={highestNumberOfRequests}
                    totalRequests={project.totalRequests}
                    schemaVersionsCount={project.schemaVersionsCount}
                    targets={project.targets.edges.map(edge => edge.node)}
                    organizationSlug={props.organizationSlug}
                    projectSlug={project.slug}
                    sortKey={sortKey}
                    sortOrder={sortOrder}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex w-full flex-col gap-y-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          )}
        </div>
      </>
    </OrganizationLayout>
  );
}

export function OrganizationPage(
  props: {
    organizationSlug: string;
  } & RouteSearchProps,
) {
  return (
    <>
      <Meta title="Organization" />
      <OrganizationPageContent
        organizationSlug={props.organizationSlug}
        search={props.search}
        sortBy={props.sortBy}
        sortOrder={props.sortOrder}
      />
    </>
  );
}
