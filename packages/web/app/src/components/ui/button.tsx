import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-neutral-2',
  {
    variants: {
      variant: {
        default: 'bg-neutral-4 text-neutral-11 hover:text-neutral-12 hover:bg-neutral-5',
        primary: 'bg-accent text-neutral-2 hover:brightness-110 active:bg-accent',
        destructive: 'bg-red-500 text-neutral-1 dark:text-neutral-12 hover:bg-red-700',
        outline:
          'text-neutral-11 hover:text-neutral-12 border border-neutral-5 hover:border-neutral-6 bg-neutral-3 hover:bg-neutral-4',
        secondary: 'bg-neutral-2 text-neutral-11 hover:bg-neutral-2/80',
        ghost: 'hover:bg-neutral-2 hover:text-neutral-12',
        link: 'underline-offset-4 hover:underline text-accent',
        orangeLink: 'h-auto p-0 underline-offset-4 hover:underline text-accent',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'size-10',
        'icon-sm': 'size-7',
        'icon-xs': 'size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
