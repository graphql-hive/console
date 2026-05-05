import { ReactElement, useMemo, useRef, useState } from 'react';
import { differenceInMilliseconds, endOfDay, formatISO, startOfDay } from 'date-fns';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useQuery } from 'urql';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { graphql } from '@/gql';
import { subDays } from '@/lib/date-time';
import { toDecimal, useFormattedNumber, useFormattedThroughput } from '@/lib/hooks';
import { useIsInView } from '@/lib/hooks/use-is-in-view';
import { cn, hexToRgba, useChartStyles } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

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
  }
`);
export const TargetCard = (props: {
  id: string;
  slug: string;
  organizationSlug: string;
  projectSlug: string;
  className?: string;
  highestNumberOfRequests?: number;
  days: number;
}): ReactElement => {
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
    pause: !isInView || !props.slug,
  });

  const target = query.data?.target;

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
    return totalNumberOfRequests || totalNumberOfFailures
      ? `${toDecimal(((totalNumberOfRequests - totalNumberOfFailures) * 100) / totalNumberOfRequests)}%`
      : '-';
  }, [totalNumberOfRequests, totalNumberOfFailures]);

  const failureRate = useMemo(() => {
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
      <div ref={ref} className={cn('space-y-4 p-4', props.className)}>
        <Link
          to="/$organizationSlug/$projectSlug/$targetSlug"
          disabled={
            props.organizationSlug == null || props.projectSlug == null || props.slug == null
          }
          params={{
            organizationSlug: props.organizationSlug ?? 'unknown-yet',
            projectSlug: props.projectSlug ?? 'unknown-yet',
            targetSlug: props.slug ?? 'unknown-yet',
          }}
          className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden"
        >
          <h4 className="line-clamp-1 text-lg font-medium">{props.slug}</h4>
          <div className="text-neutral-11 flex items-center gap-1 group-hover:underline">
            Open <ArrowUpRight className="size-4" />
          </div>
        </Link>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-neutral-11">Commits</div>
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
                onValueChange={value => setSelectedLatencyKind(value as typeof selectedLatencyKind)}
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
          <div className="h-24">
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
                        max: props.highestNumberOfRequests,
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
      </div>
    </TooltipProvider>
  );
};

export const TargetCardSkeleton = (props: { className?: string }): ReactElement => {
  return (
    <div className={cn('space-y-4 p-4', props.className)}>
      <div className="group grid w-full grid-cols-[1fr_auto] items-center gap-8 overflow-hidden">
        <div className="bg-neutral-2 dark:bg-neutral-5 h-4 w-32 rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-neutral-11">Commits</div>
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
        <div className="h-24" />
      </div>
    </div>
  );
};
