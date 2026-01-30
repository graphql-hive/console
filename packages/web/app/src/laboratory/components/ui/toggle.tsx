import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/laboratory/lib/utils';
import * as TogglePrimitive from '@radix-ui/react-toggle';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-neutral-3 hover:text-neutral-10 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-neutral-2 data-[state=on]:text-neutral-12 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-red/20  aria-invalid:border-red whitespace-nowrap",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-neutral-5 bg-transparent shadow-sm hover:bg-neutral-2 hover:text-neutral-12',
      },
      size: {
        default: 'h-9 px-2 min-w-9',
        sm: 'h-8 px-1.5 min-w-8',
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
