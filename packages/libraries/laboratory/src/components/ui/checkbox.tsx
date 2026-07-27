import { CheckIcon } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '../../lib/utils';

function Checkbox({
  className,
  asSpan,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  /**
   * Render as a span rather than a button. For checkboxes sitting inside another
   * button, where nesting one button in another is invalid HTML. Costs keyboard
   * focus, which nesting had already made unreliable.
   */
  asSpan?: boolean;
}) {
  const indicator = (
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className="grid place-content-center text-current transition-none"
    >
      <CheckIcon className="size-3.5" />
    </CheckboxPrimitive.Indicator>
  );

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      asChild={asSpan}
      className={cn(
        'border-input bg-input/30 data-[state=checked]:text-primary-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer size-4 shrink-0 rounded-[4px] border shadow-sm outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {asSpan ? <span>{indicator}</span> : indicator}
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
