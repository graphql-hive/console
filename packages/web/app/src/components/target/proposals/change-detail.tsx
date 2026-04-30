import { ReactNode } from 'react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion } from '@/components/v2';
import { MergeStatus } from '@/pages/target-proposal-details';
import type { Change } from '@graphql-inspector/core';
import { ComponentNoneIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { labelize } from '../history/errors-and-changes';

function ExpandedContent({
  organizationSlug,
  projectSlug,
  targetSlug,
  implementedBy,
  error,
}: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  implementedBy?: string;
  error?: Error;
}) {
  if (!error && !implementedBy) {
    return <>No details available for this change.</>;
  }

  return (
    <>
      {error ? <div className="text-red-500">{error.message}</div> : null}
      {implementedBy ? (
        <>
          This proposed change has been implemented.{' '}
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{
              organizationSlug,
              projectSlug,
              targetSlug,
              versionId: implementedBy,
            }}
            variant="primary"
          >
            View full change in history
          </Link>
          .
        </>
      ) : null}
    </>
  );
}

export function ProposalChangeDetail(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  change: Change<any>;
  error?: Error;
  icon?: ReactNode;
  /** This is the schema version ID that introduced this change */
  implementedBy?: string;
}) {
  return (
    <Accordion type="single">
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="text-neutral-10 py-3 hover:no-underline">
            <div className="flex w-full flex-row items-center text-left">
              <div>{labelize(props.change.message)}</div>
              <div className="min-w-fit grow pr-2 md:flex-none">{props.icon}</div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pl-2">
          <ExpandedContent {...props} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function ChangeBlock(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  title: string;
  info: string;
  changes: Array<{
    change: Change;
    error?: Error;
    mergeStatus?: MergeStatus;
    implementedBy?: string;
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
          {props.changes.map(({ change, error, mergeStatus, implementedBy }, i) => {
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
                <span className="text-neutral-10 flex items-center justify-end pl-4">
                  <ComponentNoneIcon className="mr-2" /> NO CHANGE
                </span>
              );
            }
            return (
              <ProposalChangeDetail
                icon={icon}
                change={change}
                key={`${change.type}-${change.path}-${i}`}
                error={error}
                implementedBy={implementedBy}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
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
          <Button variant="ghost" size="icon-sm" className="text-neutral-10 ml-1">
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
