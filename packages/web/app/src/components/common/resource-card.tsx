import { useMemo, type ReactNode } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Globe, History } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card } from '@/components/base/card/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { subDays } from '@/lib/date-time';
import { useFormattedNumber } from '@/lib/hooks';
import { pluralize } from '@/lib/utils';

/**
 * The summary tile used for a project on the organization page and for a target on the project
 * page: a full-bleed request sparkline over a name, with request and schema-version counts.
 *
 * The link is a render prop rather than `to`/`params` props, so each call site keeps TanStack's
 * route and param checking on its own literal route.
 */
export function ResourceCard(props: {
  /** Names the resource in the schema-versions tooltip, and reserves a skeleton line for `subtitle`. */
  kind: 'project' | 'target';
  /** `null` while loading, which is what swaps the name and counts for skeletons. */
  name: string | null;
  /** Second line under the name. Projects show their type here; targets have nothing to show. */
  subtitle?: string;
  renderLink: (children: ReactNode) => ReactNode;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
}) {
  const { highestNumberOfRequests } = props;

  const requests = useMemo(() => {
    if (props.requestsOverTime?.length) {
      return props.requestsOverTime.map<[string, number]>(node => [node.date, node.value]);
    }

    // A flat pair rather than an empty array, so the chart draws a baseline instead of nothing.
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

  return (
    <div className="h-full self-start">
      <Card variants={{ onSurface: 'raised', interactive: true, bodyPadding: 'none' }}>
        {props.renderLink(
          <TooltipProvider>
            <div className="flex items-start gap-x-2">
              <div className="grow">
                <div>
                  <AutoSizer disableHeight>
                    {size => (
                      <ReactECharts
                        style={{ width: size.width, height: 90 }}
                        option={{
                          animation: props.name != null,
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
                              areaStyle: {
                                opacity: 0.8,
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                  {
                                    offset: 0,
                                    color: 'rgba(244, 184, 64, 0.20)',
                                  },
                                  {
                                    offset: 1,
                                    color: 'rgba(244, 184, 64, 0)',
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
                <div className="flex flex-row items-center justify-between gap-y-3 px-4 pt-4">
                  {props.name != null ? (
                    <div>
                      <h4 className="line-clamp-2 text-lg font-bold">{props.name}</h4>
                      {props.subtitle ? (
                        <p className="text-neutral-11 text-xs">{props.subtitle}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <div className="bg-neutral-5 h-4 w-48 animate-pulse rounded-full py-2" />
                      {/* Only reserve the second line for a kind that has a subtitle to load into. */}
                      {props.kind === 'project' ? (
                        <div className="bg-neutral-5 mt-4 h-2 w-24 animate-pulse rounded-full" />
                      ) : null}
                    </div>
                  )}
                  <div className="flex flex-col gap-y-2 py-1">
                    {props.name != null ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex flex-row items-center gap-x-2">
                              <Globe className="text-neutral-10 size-4" />
                              <div className="text-xs">
                                {requestsInDateRange}{' '}
                                {pluralize(totalNumberOfRequests, 'request', 'requests')}
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
                            Number of schemas pushed to this {props.kind} in the last {props.days}{' '}
                            days.
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <div className="bg-neutral-5 my-1 h-2 w-16 animate-pulse rounded-full" />
                        <div className="bg-neutral-5 my-1 h-2 w-16 animate-pulse rounded-full" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TooltipProvider>,
        )}
      </Card>
    </div>
  );
}
