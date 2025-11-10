import { cn, createForwardRefComponent } from '@/lib/utils';
import { Root, Thumb } from '@radix-ui/react-switch';

const Switch = createForwardRefComponent(Root)(({ className, ...props }, ref) => (
  <Root
    className={cn(
      'focus-visible:ring-ring focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
    ref={ref}
  >
    <Thumb
      className={cn(
        'bg-background pointer-events-none block size-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
      )}
    />
  </Root>
));
Switch.displayName = Root.displayName;

export { Switch };
