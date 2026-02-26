import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/lib/hooks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

type CopyIconButtonProps = {
  label: string;
  value: string;
};

export function CopyIconButton(props: CopyIconButtonProps) {
  const clipboard = useClipboard();
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0} disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => clipboard(props.value)}
            className="ml-auto"
          >
            <CopyIcon size="10" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{props.label}</TooltipContent>
      </Tooltip>{' '}
    </TooltipProvider>
  );
}
