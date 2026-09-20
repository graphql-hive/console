import { ReactNode } from 'react';
import { Diamond, Info, TriangleAlert } from 'lucide-react';
import { Accordion } from '@/components/base/accordion/accordion';
import { Popover } from '@/components/base/floating/popover/popover';
import { Button } from '@/components/ui/button';
import { MergeStatus } from '@/pages/target-proposal-details';
import type { Change } from '@graphql-inspector/core';
import { labelize } from '../history/errors-and-changes';

export function ProposalChangeDetail(props: {
  change: Change<any>;
  error?: Error;
  icon?: ReactNode;
}) {
  return (
    <Accordion
      items={[
        {
          value: 'item-1',
          label: (
            <div className="text-neutral-8 flex w-full flex-row items-center">
              <div>{labelize(props.change.message)}</div>
              <div className="min-w-fit grow pr-2 md:flex-none">{props.icon}</div>
            </div>
          ),
          content: props.error?.message ?? 'No details available for this change.',
        },
      ]}
    />
  );
}

export function ChangeBlock(props: {
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
        <h2 className="text-neutral-10 mb-2 mt-6 flex items-center font-bold">
          {props.title}
          {props.info && <ChangesBlockTooltip info={props.info} />}
        </h2>
        <div className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          {props.changes.map(({ change, error, mergeStatus }, i) => {
            let icon: ReactNode | undefined;
            if (mergeStatus === MergeStatus.CONFLICT) {
              icon = (
                <span className="flex items-center justify-end pl-4 text-red-400">
                  <TriangleAlert className="mr-2 size-4" />
                  CONFLICT
                </span>
              );
            } else if (mergeStatus === MergeStatus.IGNORED) {
              icon = (
                <span className="text-neutral-10 flex items-center justify-end pl-4">
                  <Diamond className="mr-2 size-4" /> NO CHANGE
                </span>
              );
            }
            return (
              <ProposalChangeDetail
                icon={icon}
                change={change}
                key={`${change.type}-${change.path}-${i}`}
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
    <Popover
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-neutral-10 ml-1"
          aria-label="More about this change"
        >
          <Info className="size-4" />
        </Button>
      }
      openOnHover
      width="lg"
      content={<p className="text-neutral-11 text-sm font-normal">{props.info}</p>}
    />
  );
}
