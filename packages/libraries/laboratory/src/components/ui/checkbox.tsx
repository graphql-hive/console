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
        'peer size-4 shrink-0 rounded-[4px] border border-input bg-input/30 shadow-sm transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      {asSpan ? <span>{indicator}</span> : indicator}
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
