import { useMemo, type ReactNode } from 'react';
import { Globe, History } from 'lucide-react';
import { Card } from '@/components/ui/primitives/card/card';
import { Sparkline } from '@/components/ui/primitives/chart/sparkline';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { subDays } from '@/lib/date-time';
import { useFormattedNumber } from '@/lib/hooks';
import { pluralize } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { resourceCardStyles } from './resource-card.css';

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
    <div className={resourceCardStyles.root}>
      <Card variants={{ onSurface: 'raised', interactive: true, bodyPadding: 'none' }}>
        {props.renderLink(
          <>
            <div className={resourceCardStyles.body}>
              <div className={shared.grow}>
                <div>
                  <Sparkline
                    name="Requests"
                    data={requests}
                    max={highestNumberOfRequests}
                    animation={props.name != null}
                  />
                </div>
                <div className={resourceCardStyles.details}>
                  {props.name != null ? (
                    <div>
                      <h4 className={resourceCardStyles.name}>{props.name}</h4>
                      {props.subtitle ? (
                        <p className={resourceCardStyles.subtitle}>{props.subtitle}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <div className={resourceCardStyles.nameSkeleton} />
                      {/* Only reserve the second line for a kind that has a subtitle to load into. */}
                      {props.kind === 'project' ? (
                        <div className={resourceCardStyles.subtitleSkeleton} />
                      ) : null}
                    </div>
                  )}
                  <div className={resourceCardStyles.stats}>
                    {props.name != null ? (
                      <>
                        <Tooltip
                          trigger={
                            <div className={resourceCardStyles.stat}>
                              <Globe className={resourceCardStyles.statIcon} />
                              <div className={shared.text.xs}>
                                {requestsInDateRange}{' '}
                                {pluralize(totalNumberOfRequests, 'request', 'requests')}
                              </div>
                            </div>
                          }
                          content={`Number of GraphQL requests in the last ${props.days} days.`}
                        />
                        <Tooltip
                          trigger={
                            <div className={resourceCardStyles.stat}>
                              <History className={resourceCardStyles.statIcon} />
                              <div className={shared.text.xs}>
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
                        <div className={resourceCardStyles.statSkeleton} />
                        <div className={resourceCardStyles.statSkeleton} />
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
