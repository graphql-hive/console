import { CheckIcon } from 'lucide-react';
import { cn } from '@/laboratory/lib/utils';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'border-neutral-5 data-[state=checked]:bg-neutral-11 data-[state=checked]:text-neutral-2 data-[state=checked]:border-neutral-11 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-red-200 aria-invalid:border-red-500 peer size-4 shrink-0 rounded-[4px] border shadow-sm outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
