import { ReactElement } from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { InputCopy } from './input-copy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

/** Renders readonly properties for resources. Used on settings pages. */
export function ResourceDetails(props: { id: string; label: string }): ReactElement {
  return (
    <div className="flex items-center">
      <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 whitespace-nowrap rounded-md rounded-r-none border-y border-l px-3 py-2 text-sm">
        {props.label}
      </div>
      <InputCopy value={props.id} className="rounded-l-none" />
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>
            <InfoCircledIcon className="ml-2 size-4 cursor-default" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-pretty">
            This UUID can be used in API calls or CLI commands to Hive instead of passing the full
            resource path. I.e. "org/project/target".
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
