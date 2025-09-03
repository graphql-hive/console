import { Fragment, ReactNode, useMemo } from 'react';
import { ProposalOverview_ReviewsFragment } from '@/components/target/proposals';
import { ProposalChangeDetail } from '@/components/target/proposals/change-detail';
import { ServiceHeading } from '@/components/target/proposals/service-heading';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType } from '@/gql';
import { Change, CriticalityLevel } from '@graphql-inspector/core';
import { ComponentNoneIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import type { ServiceProposalDetails } from './target-proposal-types';

export enum MergeStatus {
  CONFLICT,
  IGNORED,
}

type MappedChange = {
  change: Change<any>;
  error?: Error;
  mergeStatus?: MergeStatus;
};

export function TargetProposalDetailsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
}) {
  const mappedServices = useMemo(() => {
    return props.services?.map(
      ({ allChanges, ignoredChanges, conflictingChanges, serviceName }) => {
        const changes = allChanges.map(c => {
          const conflict = conflictingChanges.find(({ change }) => c === change);
          if (conflict) {
            return {
              change: c,
              error: conflict.error,
              mergeStatus: MergeStatus.CONFLICT,
            };
          }
          const ignored = ignoredChanges.find(({ change }) => c === change);
          if (ignored) {
            return null;
          }
          return { change: c };
        });

        const breaking: MappedChange[] = [];
        const dangerous: MappedChange[] = [];
        const safe: MappedChange[] = [];
        for (const change of changes) {
          if (change) {
            const level = change.change.criticality.level;
            if (level === CriticalityLevel.Breaking) {
              breaking.push(change);
            } else if (level === CriticalityLevel.Dangerous) {
              dangerous.push(change);
            } else {
              // if (level === CriticalityLevel.NonBreaking) {
              safe.push(change);
            }
          }
        }
        return {
          hasChanges: allChanges.length > 0,
          safe,
          breaking,
          dangerous,
          ignored: ignoredChanges.map(c => ({ ...c, mergeStatus: MergeStatus.IGNORED })),
          serviceName,
        };
      },
    );
  }, [props.services]);

  return (
    <div className="w-full">
      {mappedServices?.map(({ safe, dangerous, breaking, ignored, serviceName, hasChanges }) => {
        // don't print service name if service was not changed
        if (!hasChanges) {
          return null;
        }
        return (
          <Fragment key={serviceName}>
            <ServiceHeading serviceName={serviceName} />
            <div className="px-2">
              <ChangeBlock
                changes={breaking}
                title="Breaking Changes"
                info="Changes that will break existing operations."
              />
              <ChangeBlock
                changes={dangerous}
                title="Dangerous Changes"
                info="Changes that could cause different behavior that might cause issues for existing operations."
              />
              <ChangeBlock
                changes={safe}
                title="Safe Changes"
                info="Changes that do not run a risk of breaking any existing operations."
              />
              <ChangeBlock
                changes={ignored}
                title="Ignored Changes"
                info="Changes that result in no difference when applied to the current version of the schemas. These can be safely ignored but are kept as part of the proposal unless explicitly removed."
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function ChangeBlock(props: {
  title: string;
  info: string;
  changes: Array<{
    change: Change;
    error?: Error;
    mergeStatus?: MergeStatus;
  }>;
}) {
  return (
    props.changes.length !== 0 && (
      <>
        <h2 className="mb-2 mt-6 flex items-center font-bold text-gray-900 dark:text-white">
          {props.title}
          {props.info && <ChangesBlockTooltip info={props.info} />}
        </h2>
        <div className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          {props.changes.map(({ change, error, mergeStatus }) => {
            let icon: ReactNode | undefined;
            if (mergeStatus === MergeStatus.CONFLICT) {
              icon = (
                <span className="flex items-center justify-end pl-4 text-red-400">
                  <ExclamationTriangleIcon className="mr-2" />
                  CONFLICT
                </span>
              );
            } else if (mergeStatus === MergeStatus.IGNORED) {
              icon = (
                <span className="flex items-center justify-end pl-4 text-gray-400">
                  <ComponentNoneIcon className="mr-2" /> NO CHANGE
                </span>
              );
            }
            return (
              <ProposalChangeDetail
                icon={icon}
                change={change}
                key={`${change.type}-${change.path}`}
                error={error}
              />
            );
          })}
        </div>
      </>
    )
  );
}

function ChangesBlockTooltip(props: { info: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger>
          <Button variant="ghost" size="icon-sm" className="ml-1 text-gray-400">
            <InfoCircledIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-md p-4 font-normal">
          <p>{props.info}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
