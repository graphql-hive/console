import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function InnerId(props: { id: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="cursor-help text-gray-700 dark:text-gray-300">{props.id}</span>
        </TooltipTrigger>
        <TooltipContent>
          This UUID can be used in API calls or CLI commands to Hive instead of passing the name(s).
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ResourceIdentifier(props: { id: string }) {
  return (
    <div className="flex flex-row gap-x-1 text-xs text-gray-600 dark:text-gray-400">
      <>Resource ID:</>
      <InnerId id={props.id} />
    </div>
  );
}
