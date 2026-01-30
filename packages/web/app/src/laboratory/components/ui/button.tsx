import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/laboratory/lib/utils';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-red/20 aria-invalid:border-red",
  {
    variants: {
      variant: {
        default: 'bg-neutral-11 text-neutral-2 hover:bg-neutral-11/90',
        destructive: 'bg-red !text-neutral-12 hover:bg-red/90 focus-visible:ring-red/20',
        outline: 'border bg-neutral-3 shadow-sm hover:bg-neutral-2 hover:text-neutral-12',
        secondary: 'bg-neutral-2 text-neutral-11 hover:bg-neutral-2/80',
        ghost: 'hover:bg-neutral-2 hover:text-neutral-12',
        link: 'text-neutral-11 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
