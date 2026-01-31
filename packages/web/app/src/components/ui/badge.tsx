import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-11 text-neutral-2 hover:bg-neutral-11/80',
        secondary: 'border-transparent bg-neutral-2 text-neutral-11 hover:bg-neutral-2/80',
        destructive: 'border-transparent bg-red text-neutral-12 hover:bg-red/80',
        outline: 'text-neutral-11',
        success: 'bg-emerald-950 text-emerald-400 border-transparent',
        warning: 'bg-yellow-700 border-transparent',
        failure: 'bg-red-900 text-neutral-12 border-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const badgeRoundedVariants = cva(
  'inline-block rounded-full mx-1 border-[3px] p-[3px] align-middle text-xs font-bold leading-none text-neutral-12',
  {
    variants: {
      color: {
        red: 'border-red-900 bg-red-500',
        yellow: 'border-yellow-900 bg-yellow-500',
        green: 'border-green-900 bg-green-500',
        gray: 'border-neutral-2 bg-neutral-10',
        orange: 'border-orange brightness-80  bg-neutral-2',
      },
    },
    defaultVariants: {
      color: 'green',
    },
  },
);

export interface BadgeRoundedProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeRoundedVariants> {
  color: 'red' | 'yellow' | 'green' | 'gray' | 'orange';
}

function BadgeRounded({ className, color, ...props }: BadgeRoundedProps) {
  return <div className={cn(badgeRoundedVariants({ color }), className)} {...props} />;
}

export { Badge, BadgeRounded, badgeRoundedVariants, badgeVariants };
