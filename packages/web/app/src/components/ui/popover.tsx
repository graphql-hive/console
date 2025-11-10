import { cn, createForwardRefComponent } from '@/lib/utils';
import { Arrow, Content, Portal, Root, Trigger } from '@radix-ui/react-popover';

const Popover = Root;

const PopoverTrigger = Trigger;

const PopoverContent = createForwardRefComponent(Content)(
  ({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
    <Portal>
      <Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </Portal>
  ),
);
PopoverContent.displayName = Content.displayName;

const PopoverArrow = createForwardRefComponent(Arrow)(({ className, ...props }, ref) => (
  <Arrow ref={ref} className={cn('fill-gray-800', className)} {...props} />
));

PopoverArrow.displayName = Arrow.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverArrow };
