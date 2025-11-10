import { cn, createForwardRefComponent } from '@/lib/utils';
import { Content, Provider, Root, Trigger } from '@radix-ui/react-tooltip';

const TooltipProvider = Provider;

const Tooltip = Root;

const TooltipTrigger = Trigger;

const TooltipContent = createForwardRefComponent(Content)(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover text-popover-foreground animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md',
        className,
      )}
      {...props}
    />
  ),
);
TooltipContent.displayName = Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
