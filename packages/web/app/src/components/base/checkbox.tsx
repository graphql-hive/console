import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

const checkboxVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4',
        lg: 'size-5',
      },
      variant: {
        default: [
          'border-neutral-7 dark:border-neutral-7',
          'data-[checked]:bg-yellow-500 data-[checked]:border-yellow-500 data-[checked]:text-neutral-1',
          'data-[indeterminate]:bg-yellow-500 data-[indeterminate]:border-yellow-500 data-[indeterminate]:text-neutral-1',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root> & VariantProps<typeof checkboxVariants>
>(({ className, size, variant, ...props }, ref) => (
  <BaseCheckbox.Root
    ref={ref}
    className={cn(checkboxVariants({ size, variant }), className)}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

const CheckboxIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof BaseCheckbox.Indicator>
>(({ className, ...props }, ref) => (
  <BaseCheckbox.Indicator
    ref={ref}
    className={cn('flex items-center justify-center text-current', className)}
    {...props}
  />
));
CheckboxIndicator.displayName = 'CheckboxIndicator';

export { Checkbox, CheckboxIndicator, checkboxVariants };
