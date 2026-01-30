import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'hover:text-neutral-12 text-neutral-11 hover:bg-neutral-5 bg-neutral-4 hover:border-neutral-6 border-neutral-5 border ring-offset-neutral-2 placeholder:text-neutral-10 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1',
        ghost: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectVariants>;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, variant, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectVariants({ variant, className }))}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="ml-2 size-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'bg-neutral-4 border-neutral-5 animate-in fade-in-80 relative z-50 min-w-[8rem] cursor-pointer overflow-hidden rounded-md border shadow-md',
        position === 'popper' && 'translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) w-full',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'text-neutral-11 focus:bg-neutral-5 focus:text-neutral-12 data-disabled:pointer-events-none data-disabled:opacity-50 relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('bg-neutral-3 -mx-1 my-1 h-px', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
