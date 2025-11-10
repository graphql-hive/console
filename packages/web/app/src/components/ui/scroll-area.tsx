import { cn, createForwardRefComponent } from '@/lib/utils';
import {
  Corner,
  Root,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  Viewport,
} from '@radix-ui/react-scroll-area';

const ScrollArea = createForwardRefComponent(Root)(({ className, children, ...props }, ref) => (
  <Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
    {/** LOL https://github.com/radix-ui/primitives/issues/2722 */}
    <Viewport className="size-full rounded-[inherit] [&>div]:!block">{children}</Viewport>
    <ScrollBar />
    <Corner />
  </Root>
));
ScrollArea.displayName = Root.displayName;

const ScrollBar = createForwardRefComponent(ScrollAreaScrollbar)(
  ({ className, orientation = 'vertical', ...props }, ref) => (
    <ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-[1px]',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
        className,
      )}
      {...props}
    >
      <ScrollAreaThumb className="bg-border relative flex-1 rounded-full" />
    </ScrollAreaScrollbar>
  ),
);
ScrollBar.displayName = ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
