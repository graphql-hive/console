import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-accent focus-visible:ring-accent_30 focus-visible:ring-[3px] aria-invalid:ring-critical_30 aria-invalid:border-critical transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-6 text-white [a&]:hover:bg-neutral-7',
        secondary:
          'border-transparent bg-neutral-2 text-neutral-11 [a&]:hover:bg-neutral-3 [a&]:hover:text-neutral-12',
        destructive:
          'border-transparent bg-red-800 text-white [a&]:hover:bg-red-800_80 focus-visible:ring-red-800_30',
        outline:
          'border-neutral-5 text-neutral-11 [a&]:hover:bg-neutral-3 [a&]:hover:text-neutral-12',
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
