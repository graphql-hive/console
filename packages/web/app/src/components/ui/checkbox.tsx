import { Check } from 'lucide-react';
import { cn, createForwardRefComponent } from '@/lib/utils';
import { Indicator, Root } from '@radix-ui/react-checkbox';

const Checkbox = createForwardRefComponent(Root)(({ className, ...props }, ref) => (
  <Root
    ref={ref}
    className={cn(
      'border-primary ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground peer size-4 shrink-0 rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <Indicator className={cn('flex items-center justify-center text-current')}>
      <Check className="size-4" />
    </Indicator>
  </Root>
));
Checkbox.displayName = Root.displayName;

export { Checkbox };
