import { ReactNode, useRef } from 'react';
import { useClipboard } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { CopyIcon } from './icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export function CopyText(props: { children: ReactNode; copy?: string; className?: string }) {
  const copyToClipboard = useClipboard();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className={cn('flex items-center', props.className)}>
      <div ref={ref} className="truncate">
        {props.children}
      </div>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>
            <Button
              className="-my-3 p-2 py-3"
              variant="link"
              onClick={async () => {
                await copyToClipboard(props.copy ?? ref.current?.innerText ?? '');
              }}
            >
              <CopyIcon size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
