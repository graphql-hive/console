import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useM,
  useMemo,
  useRef,
  useState,
  useStateemo,
} from 'react';
import { differenceInMilliseconds, endOfDay, formatISO, startOfDay } from 'date-fns';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Globe, History, MoveDownIcon, MoveUpIcon, SearchIcon } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { z } from 'zod';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyList } from '@/components/ui/empty-list';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { OperationsStats, ProjectType } from '@/gql/graphql';
import { subDays } from '@/lib/date-time';
import { toDecimal, useFormattedNumber, useFormattedThroughput } from '@/lib/hooks';
import { cn, hexToRgba, pluralize, useChartStyles } from '@/lib/utils';
import { UTCDate } from '@date-fns/utc';
import { Link, useRouter } from '@tanstack/react-router';

export const OrganizationIndexRouteSearch = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['requests', 'versions', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type RouteSearchProps = z.infer<typeof OrganizationIndexRouteSearch>;

const ProjectCard_ProjectFragment = graphql(`
  fragment ProjectCard_ProjectFragment on Project {
    id
    slug
    type
  }
`);

const TargetCard_TargetFragment = graphql(`
  fragment TargetCard_TargetFragment on Target {
    id
    slug
  }
`);

export const OverTimeStats_OrganizationProjectsPageFragment = graphql(`
  fragment OverTimeStats_OrganizationProjectsPageFragment on OperationsStats {
    failuresOverTime(resolution: $chartResolution) {
      date
      value
    }
    requestsOverTime(resolution: $chartResolution) {
      date
      value
    }
  }
`);

const TargetCardQuery = graphql(`
  query TargetCardQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $chartResolution: Int!
    $period: DateRangeInput!
  ) {
    target: target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      slug
      ...TargetCard_TargetFragment
      totalRequests(period: $period)
      requestsOverTime(resolution: $chartResolution, period: $period) {
        date
        value
      }
      schemaVersionsCount(period: $period)
      operationsStats(period: $period) {
        ... on OperationsStats {
          totalRequests
          totalFailures
          totalOperations
          duration {
            p75
            p90
            p95
            p99
          }
        }
        ...OverTimeStats_OrganizationProjectsPageFragment
      }
    }
  }
`);

const OrganizationProjectsPageQuery = graphql(`
  query OrganizationProjectsPageQuery(
    $organizationSlug: String!
    $chartResolution: Int!
    $period: DateRangeInput!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
            ...ProjectCard_ProjectFragment
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

const NewProjectCardTargetCardCount = (props: {
  title: string;
  count: string;
  description: string;
}) => {
  return (
    <div className="bg-neutral-2 dark:bg-neutral-2 border-neutral-5 dark:border-neutral-4 flex flex-col rounded-lg border p-4">
      <div className="mb-2 text-xs font-medium">{props.title}</div>
      <div className="text-2xl font-bold">{props.count}</div>
      <div className="whitespace-nowrap text-xs">{props.description}</div>
    </div>
  );
};

const useIsInView = (ref: React.RefObject<HTMLDivElement>) => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(entry.isIntersecting);
        }
      });

      observer.observe(ref.current);

      return () => observer.disconnect();
    }
  }, [ref]);

  return isInView;
};

export const NewProjectCardTargetCard = (props: {
  target: FragmentType<typeof TargetCard_TargetFragment> | null;
  className?: string;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
  organizationSlug: string;
  projectSlug: string;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useIsInView(ref);

  const { highestNumberOfRequests } = props;

  const period = {
    from: formatISO(startOfDay(subDays(new Date(), props.days))),
    to: formatISO(endOfDay(new Date())),
  };

  const [query] = useQuery({
    query: TargetCardQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.target?.slug ?? '',
      chartResolution: props.days,
      period,
    },
    requestPolicy: 'network-only',
    pause: !isInView || !props.target?.slug,
  });

  const target = query.data?.target;

  const requests = useMemo(() => {
    if (target?.requestsOverTime?.length) {
      return target.requestsOverTime.map<[string, number]>(node => [node.date, node.value]);
    }

    return [
      [new Date(subDays(new Date(), props.days)).toISOString(), 0],
      [new Date().toISOString(), 0],
    ] as [string, number][];
  }, [target?.requestsOverTime]);

  const failures = useMemo(() => {
    if (target?.operationsStats?.failuresOverTime?.length) {
      return target.operationsStats.failuresOverTime.map<[string, number]>(node => [
        node.date,
        node.value,
      ]);
    }

    return [
      [new Date(subDays(new Date(), props.days)).toISOString(), 0],
      [new Date().toISOString(), 0],
    ] as [string, number][];
  }, [target?.operationsStats?.failuresOverTime]);

  const totalNumberOfRequests = useMemo(
    () => requests.reduce((acc, [_, value]) => acc + value, 0),
    [requests],
  );
  const totalNumberOfVersions = props.schemaVersionsCount ?? 0;
  const requestsInDateRange = useFormattedNumber(totalNumberOfRequests);
  const schemaVersionsInDateRange = useFormattedNumber(totalNumberOfVersions);
  const rpm = useFormattedThroughput({
    requests: totalNumberOfRequests,
    window: differenceInMilliseconds(new Date(period.to), new Date(period.from)),
  });
  const totalFailures = target?.operationsStats?.totalFailures ?? 0;

  const successRate = useMemo(() => {
    return totalNumberOfRequests || totalFailures
      ? `${toDecimal(((totalNumberOfRequests - totalFailures) * 100) / totalNumberOfRequests)}%`
      : '-';
  }, [totalNumberOfRequests, totalFailures]);

  const failureRate = useMemo(() => {
    return totalNumberOfRequests || totalFailures
      ? `${toDecimal((totalFailures * 100) / totalNumberOfRequests)}%`
      : '-';
  }, [totalNumberOfRequests, totalFailures]);

  const { colors } = useChartStyles();

  return (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug"
      disabled={props.organizationSlug == null || props.projectSlug == null || target?.slug == null}
      params={{
        organizationSlug: props.organizationSlug ?? 'unknown-yet',
        projectSlug: props.projectSlug ?? 'unknown-yet',
        targetSlug: target?.slug ?? 'unknown-yet',
      }}
    >
      <TooltipProvider>
        <div ref={ref} className={cn('space-y-4 p-4', props.className)}>
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="grid grid-cols-2 gap-2">
              <NewProjectCardTargetCardCount
                title="Requests"
                count={`${requestsInDateRange}`}
                description="Requests served"
              />
              <NewProjectCardTargetCardCount
                title="RPM"
                count={`${rpm}`}
                description="Throughput"
              />
              <NewProjectCardTargetCardCount
                title="Success rate"
                count={successRate}
                description="Successfull requests"
              />
              <NewProjectCardTargetCardCount
                title="Errors"
                count={failureRate}
                description="Failed requests"
              />
            </div>
            <div>
              <AutoSizer>
                {size => (
                  <ReactECharts
                    style={{ width: size.width, height: size.height }}
                    option={{
                      animation: !!target,
                      color: ['#f4b740'],
                      grid: {
                        left: 0,
                        top: 10,
                        right: 0,
                        bottom: 10,
                      },
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                          label: {
                            formatter({ value }: { value: number }) {
                              return new Date(value).toDateString();
                            },
                          },
                        },
                      },
                      xAxis: [
                        {
                          show: false,
                          type: 'time',
                          boundaryGap: false,
                        },
                      ],
                      yAxis: [
                        {
                          show: false,
                          type: 'value',
                          min: 0,
                          max: highestNumberOfRequests,
                        },
                      ],
                      series: [
                        {
                          name: 'Requests',
                          type: 'line',
                          smooth: false,
                          lineStyle: {
                            width: 2,
                          },
                          showSymbol: false,
                          color: colors.primary,
                          areaStyle: {
                            opacity: 0.8,
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                              {
                                offset: 0,
                                color: colors.primary,
                              },
                              {
                                offset: 1,
                                color: hexToRgba(colors.primary, 0),
                              },
                            ]),
                          },
                          emphasis: {
                            focus: 'series',
                          },
                          data: requests,
                        },
                        {
                          name: 'Failures',
                          type: 'line',
                          smooth: false,
                          lineStyle: {
                            width: 2,
                          },
                          showSymbol: false,
                          color: colors.error,
                          areaStyle: {
                            opacity: 0.8,
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                              {
                                offset: 0,
                                color: colors.error,
                              },
                              {
                                offset: 1,
                                color: hexToRgba(colors.error, 0),
                              },
                            ]),
                          },
                          emphasis: {
                            focus: 'series',
                          },
                          data: failures,
                        },
                      ],
                    }}
                  />
                )}
              </AutoSizer>
            </div>
          </div>
          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden">
            <div>
              <h4 className="line-clamp-2 text-lg font-bold">{target?.slug}</h4>
              <p className="text-neutral-11 text-xs">{target?.type}</p>
            </div>
            <div className="ml-auto flex flex-col gap-y-2">
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex flex-row items-center gap-x-2">
                    <History className="text-neutral-10 size-4" />
                    <div className="text-xs">
                      {schemaVersionsInDateRange}{' '}
                      {pluralize(totalNumberOfVersions, 'commit', 'commits')}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Number of schemas pushed to this project in the last {props.days} days.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Link>
  );
};

const NewProjectCard = (props: {
  project: FragmentType<typeof ProjectCard_ProjectFragment> | null;
  cleanOrganizationId: string | null;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
  targets: FragmentType<typeof TargetCard_TargetFragment>[] | null;
  organizationSlug: string;
  projectSlug: string;
  sortKey: string;
  sortOrder: number;
}) => {
  const project = useFragment(ProjectCard_ProjectFragment, props.project);

  const requests = useMemo(() => {
    if (props.requestsOverTime?.length) {
      return props.requestsOverTime.map<[string, number]>(node => [node.date, node.value]);
    }

    return [
      [new Date(subDays(new Date(), props.days)).toISOString(), 0],
      [new Date().toISOString(), 0],
    ] as [string, number][];
  }, [props.requestsOverTime]);

  const totalNumberOfRequests = useMemo(
    () => requests.reduce((acc, [_, value]) => acc + value, 0),
    [requests],
  );
  const totalNumberOfVersions = props.schemaVersionsCount ?? 0;

  const requestsInDateRange = useFormattedNumber(totalNumberOfRequests);
  const schemaVersionsInDateRange = useFormattedNumber(totalNumberOfVersions);

  const sortedTargets = useMemo(() => {
    return props.targets?.sort((a, b) => {
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

  if (!project) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="border-neutral-5 dark:border-neutral-4 bg-neutral-4 dark:bg-neutral-1 overflow-hidden rounded-lg border">
        <Link
          to="/$organizationSlug/$projectSlug"
          params={{ organizationSlug: props.organizationSlug, projectSlug: props.projectSlug }}
          className="grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden p-4"
        >
          <div>
            <h4 className="line-clamp-2 text-lg font-bold">{project.slug}</h4>
            <p className="text-neutral-11 text-xs">{projectTypeFullNames[project.type]}</p>
          </div>
          <div className="ml-auto flex flex-col gap-y-2">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex flex-row items-center gap-x-2">
                  <Globe className="text-neutral-10 size-4" />
                  <div className="text-xs">
                    {requestsInDateRange} {pluralize(totalNumberOfRequests, 'request', 'requests')}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Number of GraphQL requests in the last {props.days} days.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex flex-row items-center gap-x-2">
                  <History className="text-neutral-10 size-4" />
                  <div className="text-xs">
                    {schemaVersionsInDateRange}{' '}
                    {pluralize(totalNumberOfVersions, 'commit', 'commits')}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Number of schemas pushed to this project in the last {props.days} days.
              </TooltipContent>
            </Tooltip>
          </div>
        </Link>
        <div className="bg-neutral-1 dark:bg-neutral-3 border-t-neutral-6 dark:border-t-neutral-5 divide-neutral-4 dark:divide-neutral-5 -mb-1 -mr-1 grid grid-cols-[repeat(auto-fit,minmax(calc(var(--spacing)*128),1fr))] divide-x divide-y rounded-t-lg border-t">
          {sortedTargets?.map(target => (
            <NewProjectCardTargetCard
              key={target.id}
              target={target}
              highestNumberOfRequests={props.highestNumberOfRequests}
              days={props.days}
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
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
                docsUrl="/management/projects#create-a-new-project"
              />
            ) : (
              <div className="flex w-full flex-col gap-y-8">
                {projects.map(project => (
                  <NewProjectCard
                    key={project.id}
                    cleanOrganizationId={currentOrganization.slug}
                    days={days}
                    highestNumberOfRequests={highestNumberOfRequests}
                    project={project}
                    requestsOverTime={project.requestsOverTime}
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
                <NewProjectCard
                  key={index}
                  days={days}
                  highestNumberOfRequests={highestNumberOfRequests}
                  project={null}
                  cleanOrganizationId={null}
                  requestsOverTime={null}
                  schemaVersionsCount={null}
                  targets={[]}
                />
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
