import { forwardRef, ReactElement, useMemo, useRef, useState } from 'react';
import { differenceInMilliseconds, endOfDay, formatISO, startOfDay } from 'date-fns';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { AlertCircleIcon, CircleQuestionMarkIcon, MoreHorizontal } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DocsLink } from '@/components/ui/docs-note';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { subDays } from '@/lib/date-time';
import { toDecimal, useFormattedNumber, useFormattedThroughput } from '@/lib/hooks';
import { useIsInView } from '@/lib/hooks/use-is-in-view';
import { cn, hexToRgba, useChartStyles } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

export const TargetCardFragment = graphql(`
  fragment TargetCardFragment on Target {
    id
    schemaVersionsCount(period: $period)
    operationsStats(period: $period) {
      failuresOverTime(resolution: $chartResolution) {
        date
        value
      }
      requestsOverTime(resolution: $chartResolution) {
        date
        value
      }
      duration {
        p75
        p90
        p95
        p99
      }
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
      ...TargetCardFragment
    }
  }
`);

export const TargetCardTitle = (props: TargetProps) => (
  <Link
    to="/$organizationSlug/$projectSlug/$targetSlug"
    disabled={props.organizationSlug == null || props.projectSlug == null || props.slug == null}
    params={{
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.slug,
    }}
    className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden"
  >
    <h4 className="line-clamp-1 text-lg font-medium group-hover:underline">{props.slug}</h4>
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
            to="/$organizationSlug/$projectSlug/$targetSlug"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Schema</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/checks"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Checks</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/explorer"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Explorer</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/history"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>History</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/insights"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Insights</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/traces"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Traces</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/apps"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Apps</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Laboratory</DropdownMenuItem>
          </Link>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/settings"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.slug,
            }}
          >
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Link>
);

interface TargetProps {
  id: string;
  slug: string;
  organizationSlug: string;
  projectSlug: string;
  className?: string;
  highestNumberOfRequests?: number;
  days: number;
  data?: FragmentType<typeof TargetCardFragment>;
}

export const TargetCard = (props: TargetProps): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useIsInView(ref);

  const period = useMemo(
    () => ({
      from: formatISO(startOfDay(subDays(new Date(), props.days))),
      to: formatISO(endOfDay(new Date())),
    }),
    [props.days],
  );

  const [query] = useQuery({
    query: TargetCardQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.slug,
      chartResolution: props.days,
      period,
    },
    requestPolicy: 'network-only',
    pause: !isInView || !props.slug || !!props.data,
  });

  const target = useFragment(TargetCardFragment, props.data ?? query.data?.target);

  const requests = useMemo(() => {
    if (target?.operationsStats?.requestsOverTime?.length) {
      return target.operationsStats.requestsOverTime.map(node => [node.date, node.value]) as [
        string,
        number,
      ][];
    }

    return [
      [new Date(subDays(new Date(), props.days)).toISOString(), 0],
      [new Date().toISOString(), 0],
    ] as [string, number][];
  }, [target?.operationsStats?.requestsOverTime]);

  const failures = useMemo(() => {
    if (target?.operationsStats?.failuresOverTime?.length) {
      return target.operationsStats.failuresOverTime.map(node => [node.date, node.value]) as [
        string,
        number,
      ][];
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

  const highestNumberOfRequests = useMemo(
    () => Math.max(props.highestNumberOfRequests ?? 0, ...requests.map(([, value]) => value)),
    [props.highestNumberOfRequests, requests],
  );

  const totalNumberOfFailures = useMemo(
    () => failures.reduce((acc, [_, value]) => acc + value, 0),
    [failures],
  );

  const totalNumberOfVersions = target?.schemaVersionsCount ?? 0;
  const requestsInDateRange = useFormattedNumber(totalNumberOfRequests);
  const schemaVersionsInDateRange = useFormattedNumber(totalNumberOfVersions);
  const rpm = useFormattedThroughput({
    requests: totalNumberOfRequests,
    window: differenceInMilliseconds(new Date(period.to), new Date(period.from)),
  });

  const successRate = useMemo(() => {
    if (!totalNumberOfRequests) {
      return '-';
    }

    return totalNumberOfRequests || totalNumberOfFailures
      ? `${toDecimal(((totalNumberOfRequests - totalNumberOfFailures) * 100) / totalNumberOfRequests)}%`
      : '-';
  }, [totalNumberOfRequests, totalNumberOfFailures]);

  const failureRate = useMemo(() => {
    if (!totalNumberOfRequests) {
      return '-';
    }

    return totalNumberOfRequests || totalNumberOfFailures
      ? `${toDecimal((totalNumberOfFailures * 100) / totalNumberOfRequests)}%`
      : '-';
  }, [totalNumberOfRequests, totalNumberOfFailures]);

  const { colors } = useChartStyles();

  const [selectedLatencyKind, setSelectedLatencyKind] = useState<'p75' | 'p90' | 'p95' | 'p99'>(
    'p95',
  );

  return (
    <TooltipProvider>
      <div
        ref={ref}
        className={cn(
          'bg-neutral-1 dark:bg-neutral-3 border-neutral-4 dark:border-neutral-5 space-y-4 overflow-hidden rounded-lg border p-4',
          props.className,
        )}
      >
        {!totalNumberOfRequests ? (
          <TargetCardSkeletonContent {...props} />
        ) : (
          <>
            <TargetCardTitle {...props} />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-neutral-11">Schema Versions</div>
                <div className="text-right font-medium">
                  {schemaVersionsInDateRange}{' '}
                  <span className="text-neutral-10">in the last {props.days} days</span>
                </div>
              </div>
              <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-neutral-11 -my-2 flex items-center gap-2">
                  Latency
                  <Select
                    value={selectedLatencyKind}
                    onValueChange={value =>
                      setSelectedLatencyKind(value as typeof selectedLatencyKind)
                    }
                  >
                    <SelectTrigger className="w-16! h-6! px-2!">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="p75">p75</SelectItem>
                      <SelectItem value="p90">p90</SelectItem>
                      <SelectItem value="p95">p95</SelectItem>
                      <SelectItem value="p99">p99</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-right font-medium">
                  {target?.operationsStats?.duration?.[selectedLatencyKind]}ms
                </div>
              </div>
              <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
              <div className="grid grid-cols-2 gap-2">
                <div className="text-neutral-11">Requests</div>
                <div className="text-right font-medium">
                  {requestsInDateRange} ({rpm} RPM)
                </div>
              </div>
              <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-neutral-11">Success rate</div>
                  <div className="text-right font-medium">{successRate}</div>
                </div>
                <div className="bg-neutral-2 relative h-1 w-full overflow-hidden rounded-lg">
                  <div
                    className="absolute bottom-0 right-0 top-0 h-full bg-red-900"
                    style={{
                      width: failureRate,
                      left: successRate,
                    }}
                  />
                  <div
                    className="absolute bottom-0 left-0 top-0 h-full bg-green-500"
                    style={{ width: successRate }}
                  />
                </div>
              </div>
              <div className="-mb-6.25 -mx-4 h-24">
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
                        ],
                      }}
                    />
                  )}
                </AutoSizer>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

const TargetCardSkeletonContent = (props: Partial<TargetProps>) => {
  const isRealTarget = !!props.slug;

  return (
    <>
      {isRealTarget ? (
        <TargetCardTitle {...(props as TargetProps)} />
      ) : (
        <div className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden">
          <div className="bg-neutral-2 dark:bg-neutral-5 h-7 w-32 rounded-full" />
        </div>
      )}
      <div className={cn('space-y-3', isRealTarget && 'opacity-25')}>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-neutral-11">Schema Versions</div>
          <div className="bg-neutral-2 dark:bg-neutral-5 ml-auto h-4 w-16 rounded-lg" />
        </div>
        <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
        <div className="grid grid-cols-2 gap-2">
          <div className="text-neutral-11 -my-2 flex items-center gap-2">Latency</div>
          <div className="bg-neutral-2 dark:bg-neutral-5 ml-auto h-4 w-16 rounded-lg" />
        </div>
        <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
        <div className="grid grid-cols-2 gap-2">
          <div className="text-neutral-11">Requests</div>
          <div className="bg-neutral-2 dark:bg-neutral-5 ml-auto h-4 w-16 rounded-lg" />
        </div>
        <div className="bg-neutral-4 dark:bg-neutral-5 h-px w-full" />
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-neutral-11">Success rate</div>
            <div className="bg-neutral-2 dark:bg-neutral-5 ml-auto h-4 w-16 rounded-lg" />
          </div>
          <div className="bg-neutral-2 relative h-1 w-full overflow-hidden rounded-lg" />
        </div>
      </div>
      <div className="-mb-6.25 flex h-24">
        {isRealTarget && (
          <Alert className="h-18 w-full">
            <AlertCircleIcon className="size-4" />
            <AlertTitle className="grid grid-cols-[1fr_auto] items-center gap-2">
              No data available.
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <CircleQuestionMarkIcon className="text-accent size-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <DocsLink href="/schema-registry/usage-reporting">
                    Read about usage reporting in the documentation
                  </DocsLink>
                </TooltipContent>
              </Tooltip>
            </AlertTitle>
            <AlertDescription className="text-neutral-10">
              There is no data available for this target yet.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
};

export const TargetCardSkeleton = forwardRef<HTMLDivElement, Partial<TargetProps>>((props, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-neutral-1 dark:bg-neutral-3 border-neutral-4 dark:border-neutral-5 grid space-y-4 rounded-lg border p-4',
        props.className,
      )}
    >
      <TooltipProvider>
        <TargetCardSkeletonContent {...props} />
      </TooltipProvider>
    </div>
  );
});
