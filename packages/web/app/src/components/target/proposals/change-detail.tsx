import { ReactNode } from 'react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion } from '@/components/v2';
import { MergeStatus } from '@/pages/target-proposal-details';
import type { Change } from '@graphql-inspector/core';
import { ComponentNoneIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { labelize } from '../history/errors-and-changes';

export function ProposalChangeDetail(props: {
  change: Change<any>;
  error?: Error;
  icon?: ReactNode;
}) {
  return (
    <Accordion type="single">
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 text-gray-600 hover:no-underline dark:text-white">
            <div className="flex w-full flex-row items-center text-left">
              <div>{labelize(props.change.message)}</div>
              <div className="min-w-fit grow pr-2 md:flex-none">{props.icon}</div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
          {props.error?.message ?? <>No details available for this change.</>}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
