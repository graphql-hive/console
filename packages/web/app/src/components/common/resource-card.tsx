import { useMemo, type ReactNode } from 'react';
import { Globe, History } from 'lucide-react';
import { Card } from '@/components/ui/primitives/card/card';
import { Sparkline } from '@/components/ui/primitives/chart/sparkline';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { subDays } from '@/lib/date-time';
import { useFormattedNumber } from '@/lib/hooks';
import { pluralize } from '@/lib/utils';

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
          <>
            <div className="flex items-start gap-x-2">
              <div className="grow">
                <div>
                  <Sparkline
                    name="Requests"
                    data={requests}
                    max={highestNumberOfRequests}
                    animation={props.name != null}
                  />
                </div>
                <div className="flex flex-row items-center justify-between gap-y-3 px-4 pt-4">
                  {props.name != null ? (
                    <div>
                      <h4 className="line-clamp-2 text-lg font-bold">{props.name}</h4>
                      {props.subtitle ? (
                        <p className="text-xs text-fg-default">{props.subtitle}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <div className="h-4 w-48 animate-pulse rounded-full bg-surface-skeleton py-2" />
                      {/* Only reserve the second line for a kind that has a subtitle to load into. */}
                      {props.kind === 'project' ? (
                        <div className="mt-4 h-2 w-24 animate-pulse rounded-full bg-surface-skeleton" />
                      ) : null}
                    </div>
                  )}
                  <div className="flex flex-col gap-y-2 py-1">
                    {props.name != null ? (
                      <>
                        <Tooltip
                          trigger={
                            <div className="flex flex-row items-center gap-x-2">
                              <Globe className="size-4 text-fg-secondary" />
                              <div className="text-xs">
                                {requestsInDateRange}{' '}
                                {pluralize(totalNumberOfRequests, 'request', 'requests')}
                              </div>
                            </div>
                          }
                          content={`Number of GraphQL requests in the last ${props.days} days.`}
                        />
                        <Tooltip
                          trigger={
                            <div className="flex flex-row items-center gap-x-2">
                              <History className="size-4 text-fg-secondary" />
                              <div className="text-xs">
                                {schemaVersionsInDateRange}{' '}
                                {pluralize(totalNumberOfVersions, 'commit', 'commits')}
                              </div>
                            </div>
                          }
                          content={`Number of schemas pushed to this ${props.kind} in the last ${props.days} days.`}
                        />
                      </>
                    ) : (
                      <>
                        <div className="my-1 h-2 w-16 animate-pulse rounded-full bg-surface-skeleton" />
                        <div className="my-1 h-2 w-16 animate-pulse rounded-full bg-surface-skeleton" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>,
        )}
      </Card>
    </div>
  );
}
