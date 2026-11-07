import { ReactNode } from 'react';
import { Diamond, Info, TriangleAlert } from 'lucide-react';
import { Accordion } from '@/components/ui/primitives/accordion/accordion';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { MergeStatus } from '@/pages/target-proposal-details';
import type { Change } from '@graphql-inspector/core';
import { ChangesTitle, labelize } from '../history/errors-and-changes';
import { changeDetailStyles } from './change-detail.css';

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
            <div className={changeDetailStyles.root}>
              <div>{labelize(props.change.message)}</div>
              <div className={changeDetailStyles.icon}>{props.icon}</div>
            </div>
          ),
          content: props.error?.message,
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
        <div className={changeDetailStyles.block}>
          <ChangesTitle>
            {props.title}
            {props.info && <ChangesBlockTooltip info={props.info} />}
          </ChangesTitle>
        </div>
        <div className={changeDetailStyles.changes}>
          {props.changes.map(({ change, error, mergeStatus }, i) => {
            let icon: ReactNode | undefined;
            if (mergeStatus === MergeStatus.CONFLICT) {
              icon = (
                <span className={changeDetailStyles.breaking}>
                  <TriangleAlert className={changeDetailStyles.markerIcon} />
                  CONFLICT
                </span>
              );
            } else if (mergeStatus === MergeStatus.IGNORED) {
              icon = (
                <span className={changeDetailStyles.unchanged}>
                  <Diamond className={changeDetailStyles.markerIcon} strokeDasharray="2 2" /> NO
                  CHANGE
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
        <Button variant="ghost" size="icon-sm" aria-label="More about this change">
          <Info className={changeDetailStyles.hintIcon} />
        </Button>
      }
      openOnHover
      width="lg"
      content={<p className={changeDetailStyles.hintText}>{props.info}</p>}
    />
  );
}
