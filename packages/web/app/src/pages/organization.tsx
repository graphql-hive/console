import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { MoreHorizontal, MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { z } from 'zod';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import {
  TargetCard,
  TargetCardFragment,
  TargetCardSkeleton,
} from '@/components/organization/TargetCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import {
  ProjectsSortDirection,
  ProjectsSortField,
  ProjectType,
  TargetsSortDirection,
  TargetsSortField,
} from '@/gql/graphql';
import { subDays } from '@/lib/date-time';
import { useIsInView } from '@/lib/hooks/use-is-in-view';
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
    $search: String
    $sort: ProjectsSortInput
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      projects(search: $search, sort: $sort) {
        edges {
          node {
            id
            slug
            type
          }
        }
      }
    }
  }
`);

const OrganizationProjectsPageProjectDataQuery = graphql(`
  query OrganizationProjectsPageProjectDataQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $period: DateRangeInput!
    $chartResolution: Int!
    $targetsSort: TargetsSortInput!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      slug
      targets(sort: $targetsSort) {
        edges {
          node {
            id
            slug
            ...TargetCardFragment
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
  period: {
    from: string;
    to: string;
  };
  sortKey: string;
  sortOrder: 'asc' | 'desc';
  highestNumberOfRequests: number;
  days: number;
  organizationSlug: string;
  projectSlug: string;
  onRequestsMaxChange: (projectId: string, value: number | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useIsInView(ref);
  const targetsSort = useMemo(() => {
    let field: TargetsSortField = TargetsSortField.Name;
    let direction: TargetsSortDirection = TargetsSortDirection.Asc;

    if (props.sortKey === 'requests') {
      field = TargetsSortField.Requests;
    } else if (props.sortKey === 'versions') {
      field = TargetsSortField.SchemaVersions;
    }

    if (props.sortOrder === 'desc') {
      direction = TargetsSortDirection.Desc;
    }

    return { field, direction, period: props.period };
  }, [props.sortKey, props.sortOrder, props.period]);

  const [query] = useQuery({
    query: OrganizationProjectsPageProjectDataQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      chartResolution: props.days,
      period: props.period,
      targetsSort,
    },
    pause: !isInView,
  });

  const targets = query.data?.project?.targets.edges.map(edge => edge.node) ?? [];
  const targetCardData = useFragment(TargetCardFragment, targets);

  const projectHighestNumberOfRequests = useMemo(() => {
    let highest = 0;

    for (const target of targetCardData) {
      for (const dataPoint of target.operationsStats?.requestsOverTime ?? []) {
        if (dataPoint.value > highest) {
          highest = dataPoint.value;
        }
      }
    }

    return highest;
  }, [targetCardData]);

  useEffect(() => {
    if (query.fetching || targets.length === 0) {
      return;
    }

    props.onRequestsMaxChange(props.id, projectHighestNumberOfRequests);
  }, [
    props.id,
    props.onRequestsMaxChange,
    projectHighestNumberOfRequests,
    query.fetching,
    targets.length,
  ]);

  useEffect(() => {
    return () => {
      props.onRequestsMaxChange(props.id, null);
    };
  }, [props.id, props.onRequestsMaxChange]);

  return (
    <TooltipProvider>
      <div
        className="border-neutral-5 dark:border-neutral-4 overflow-hidden rounded-lg border"
        ref={ref}
      >
        <Link
          to="/$organizationSlug/$projectSlug"
          params={{ organizationSlug: props.organizationSlug, projectSlug: props.projectSlug }}
          className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden p-4"
        >
          <div className="flex gap-x-2">
            <h4 className="line-clamp-2 text-lg font-medium group-hover:underline">{props.slug}</h4>
            <Badge variant="outline">{projectTypeFullNames[props.type]}</Badge>
          </div>
          <div className="flex">
            <Button variant="outline" size="xs" className="rounded-r-none">
              Open
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xs" className="rounded-l-none border-l-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <Link
                  to="/$organizationSlug/$projectSlug"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                  }}
                >
                  <DropdownMenuItem>
                    <span>Targets</span>
                  </DropdownMenuItem>
                </Link>
                <Link
                  to="/$organizationSlug/$projectSlug/view/alerts"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                  }}
                >
                  <DropdownMenuItem>
                    <span>Alerts</span>
                  </DropdownMenuItem>
                </Link>
                <Link
                  to="/$organizationSlug/$projectSlug/view/settings"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                  }}
                >
                  <DropdownMenuItem>
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Link>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] gap-4 px-4 pb-4">
          {targets.length === 0 || query.fetching
            ? Array.from({ length: 3 }).map((_, index) => (
                <TargetCardSkeleton key={index} className="rounded-sm" />
              ))
            : targets?.map(target => (
                <TargetCard
                  key={target.id}
                  id={target.id}
                  slug={target.slug}
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  highestNumberOfRequests={props.highestNumberOfRequests}
                  days={props.days}
                  className="rounded-sm"
                  data={target as FragmentType<typeof TargetCardFragment>}
                />
              ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

const ProjectCardSkeleton = () => {
  return (
    <div className="border-neutral-5 dark:border-neutral-4 overflow-hidden rounded-lg border">
      <div className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden p-4">
        <div className="flex gap-x-2">
          <div className="bg-neutral-2 dark:bg-neutral-5 h-7 w-32 rounded-full" />
          <Badge variant="secondary" className="w-16" />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] gap-4 px-4 pb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <TargetCardSkeleton key={index} className="rounded-sm" />
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
  const now = useRef<UTCDate>(new UTCDate());

  const period = useRef<{
    from: string;
    to: string;
  }>({
    from: formatISO(startOfDay(subDays(now.current, days))),
    to: formatISO(endOfDay(now.current)),
  });

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

  const router = useRouter();

  const sort = useMemo(() => {
    let field: ProjectsSortField = ProjectsSortField.Name;
    let direction: ProjectsSortDirection = ProjectsSortDirection.Asc;

    if (sortKey === 'requests') {
      field = ProjectsSortField.Requests;
    } else if (sortKey === 'versions') {
      field = ProjectsSortField.SchemaVersions;
    }

    if (sortOrder === 'desc') {
      direction = ProjectsSortDirection.Desc;
    }

    return { field, direction, period: period.current };
  }, [sortKey, sortOrder, period.current]);

  const [query] = useQuery({
    query: OrganizationProjectsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      search: props.search,
      sort,
    },
    requestPolicy: 'cache-and-network',
  });

  const currentOrganization = query.data?.organization;
  const projectsConnection = currentOrganization?.projects;

  const projects = projectsConnection?.edges.map(edge => edge.node);

  const [projectRequestsMaxById, setProjectRequestsMaxById] = useState(
    () => new Map<string, number>(),
  );

  useEffect(() => {
    setProjectRequestsMaxById(new Map());
  }, [props.organizationSlug, props.search, sortKey, sortOrder]);

  const onProjectRequestsMaxChange = useCallback((projectId: string, value: number | null) => {
    setProjectRequestsMaxById(current => {
      const next = new Map(current);

      if (value === null) {
        next.delete(projectId);
      } else {
        next.set(projectId, value);
      }

      return next;
    });
  }, []);

  const highestNumberOfRequests = useMemo(
    () => Math.max(10, ...projectRequestsMaxById.values()),
    [projectRequestsMaxById],
  );

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
          {currentOrganization && projects ? (
            projects?.length === 0 ? (
              <EmptyList
                title="Hive is waiting for your first project"
                description='You can create a project by clicking the "New Project" button'
                docsUrl="/schema-registry/management/projects#create-a-new-project"
              />
            ) : (
              <div className="flex w-full flex-col gap-y-8">
                {projects?.map(project => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    slug={project.slug}
                    type={project.type}
                    days={days}
                    highestNumberOfRequests={highestNumberOfRequests}
                    period={period.current}
                    sortKey={sortKey}
                    sortOrder={sortOrder}
                    organizationSlug={props.organizationSlug}
                    projectSlug={project.slug}
                    onRequestsMaxChange={onProjectRequestsMaxChange}
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
