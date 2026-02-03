import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/laboratory/lib/utils';
import { Slot } from '@radix-ui/react-slot';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-red-200 aria-invalid:border-red-500 transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-11 text-neutral-2 [a&]:hover:bg-neutral-11/90',
        secondary: 'border-transparent bg-neutral-2 text-neutral-11 [a&]:hover:bg-neutral-2/90',
        destructive:
          'border-transparent bg-red-500 text-neutral-12 [a&]:hover:bg-red-900 focus-visible:ring-red-200',
        outline: 'text-neutral-11 [a&]:hover:bg-neutral-2 [a&]:hover:text-neutral-12',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
