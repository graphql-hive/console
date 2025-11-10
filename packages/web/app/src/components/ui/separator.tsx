import { cn, createForwardRefComponent } from '@/lib/utils';
import { Root } from '@radix-ui/react-separator';

const Separator = createForwardRefComponent(Root)(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = Root.displayName;

export { Separator };
