import { Fragment, ReactNode } from 'react';
import { ProposalOverview_ReviewsFragment } from '@/components/proposal';
import { ProposalChangeDetail } from '@/components/target/proposals/change-detail';
import { Title } from '@/components/ui/page';
import { FragmentType } from '@/gql';
import { Change, CriticalityLevel } from '@graphql-inspector/core';
import {
  ComponentNoneIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  LinkBreak2Icon,
} from '@radix-ui/react-icons';
import type { ServiceProposalDetails } from './target-proposal-types';

export enum MergeStatus {
  CONFLICT,
  IGNORED,
}

export function TargetProposalDetailsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
}) {
  return (
    <div className="w-full">
      {props.services?.map(({ allChanges, ignoredChanges, conflictingChanges, serviceName }) => {
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
            return {
              change: c,
              error: ignored.error,
              mergeStatus: MergeStatus.IGNORED,
            };
          }
          return { change: c };
        });
        const breakingChanges = changes.filter(({ change }) => {
          return change.criticality.level === CriticalityLevel.Breaking;
        });
        const dangerousChanges = changes.filter(({ change }) => {
          return change.criticality.level === CriticalityLevel.Dangerous;
        });
        const safeChanges = changes.filter(({ change }) => {
          return change.criticality.level === CriticalityLevel.NonBreaking;
        });
        return (
          <Fragment key={serviceName}>
            {serviceName.length !== 0 && (
              <Title className="flex items-center">
                <CubeIcon className="mr-2 h-6 w-auto flex-none" /> {serviceName}
              </Title>
            )}
            <ChangeBlock changes={breakingChanges} title="Breaking Changes" />
            <ChangeBlock changes={dangerousChanges} title="Dangerous Changes" />
            <ChangeBlock changes={safeChanges} title="Safe Changes" />
          </Fragment>
        );
      })}
    </div>
  );
}

function ChangeBlock(props: {
  title: string;
  changes: Array<{ change: Change; error?: Error; mergeStatus?: MergeStatus }>;
}) {
  return (
    props.changes.length !== 0 && (
      <>
        <h2 className="mb-2 mt-4 font-bold text-gray-900 dark:text-white">{props.title}</h2>
        <div className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          {props.changes.map(({ change, error, mergeStatus }) => {
            let icon: ReactNode | undefined;
            if (mergeStatus === MergeStatus.CONFLICT) {
              icon = (
                <span className="flex items-center pl-4 text-red-400">
                  <ExclamationTriangleIcon className="mr-2" />
                  CONFLICT
                </span>
              );
            } else if (mergeStatus === MergeStatus.IGNORED) {
              icon = (
                <span className="flex items-center pl-4 text-gray-400">
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
