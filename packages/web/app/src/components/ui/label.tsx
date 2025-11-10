import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Root } from '@radix-ui/react-label';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = forwardRef<
  ElementRef<typeof Root>,
  ComponentPropsWithoutRef<typeof Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = Root.displayName;

export { Label };
