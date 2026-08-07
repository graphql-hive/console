import { ReactElement, useMemo } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Globe, History } from 'lucide-react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { subDays } from '@/lib/date-time';
import { useFormattedNumber } from '@/lib/hooks';
import { pluralize } from '@/lib/utils';
import { Link } from '@tanstack/react-router';

export const ProjectCard_ProjectFragment = graphql(`
  fragment ProjectCard_ProjectFragment on Project {
    id
    slug
    type
  }
`);

const projectTypeFullNames = {
  [ProjectType.Federation]: 'Federation',
  [ProjectType.Stitching]: 'Schema Stitching',
  [ProjectType.Single]: 'Monolithic Schema',
};

export const ProjectCard = (props: {
  project: FragmentType<typeof ProjectCard_ProjectFragment> | null;
  cleanOrganizationId: string | null;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
}): ReactElement | null => {
  const project = useFragment(ProjectCard_ProjectFragment, props.project);

  const { highestNumberOfRequests } = props;

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

  return (
    <Card className="hover:bg-neutral-4 hover:shadow-neutral-3/50 h-full self-start p-5 px-0 pt-4 hover:shadow-md">
      <Link
        to="/$organizationSlug/$projectSlug"
        disabled={props.cleanOrganizationId == null || project?.slug == null}
        params={{
          organizationSlug: props.cleanOrganizationId ?? 'unknown-yet',
          projectSlug: project?.slug ?? 'unknown-yet',
        }}
      >
        <TooltipProvider>
          <div className="flex items-start gap-x-2">
            <div className="grow">
              <div>
                <AutoSizer disableHeight>
                  {size => (
                    <ReactECharts
                      style={{ width: size.width, height: 90 }}
                      option={{
                        animation: !!project,
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
                {project ? (
                  <div>
                    <h4 className="line-clamp-2 text-lg font-bold">{project.slug}</h4>
                    <p className="text-neutral-11 text-xs">{projectTypeFullNames[project.type]}</p>
                  </div>
                ) : (
                  <div>
                    <div className="bg-neutral-5 mb-4 h-4 w-48 animate-pulse rounded-full py-2" />
                    <div className="bg-neutral-5 h-2 w-24 animate-pulse rounded-full" />
                  </div>
                )}
                <div className="flex flex-col gap-y-2 py-1">
                  {project ? (
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
                          Number of schemas pushed to this project in the last {props.days} days.
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
        </TooltipProvider>
      </Link>
    </Card>
  );
};
