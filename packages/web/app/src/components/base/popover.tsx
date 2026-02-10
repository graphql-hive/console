import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

const popoverPopupVariants = cva(
  'z-50 rounded-md border shadow-md outline-none',
  {
    variants: {
      variant: {
        default: 'bg-neutral-1 border-neutral-4 dark:bg-neutral-4 dark:border-neutral-5',
      },
      size: {
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

// Re-export Root and Trigger directly
const Popover = BasePopover.Root;
const PopoverTrigger = BasePopover.Trigger;
const PopoverPortal = BasePopover.Portal;
const PopoverClose = BasePopover.Close;

// Positioner with sensible defaults
const PopoverPositioner = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Positioner>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <BasePopover.Positioner
    ref={ref}
    sideOffset={sideOffset}
    className={cn('outline-none', className)}
    {...props}
  />
));
PopoverPositioner.displayName = 'PopoverPositioner';

// Popup with styled defaults
const PopoverPopup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Popup> &
    VariantProps<typeof popoverPopupVariants>
>(({ className, variant, size, ...props }, ref) => (
  <BasePopover.Popup
    ref={ref}
    className={cn(popoverPopupVariants({ variant, size }), className)}
    {...props}
  />
));
PopoverPopup.displayName = 'PopoverPopup';

// Arrow with styled defaults
const PopoverArrow = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Arrow>
>(({ className, ...props }, ref) => (
  <BasePopover.Arrow
    ref={ref}
    className={cn('dark:fill-neutral-4 fill-neutral-1', className)}
    {...props}
  />
));
PopoverArrow.displayName = 'PopoverArrow';

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverArrow,
  PopoverClose,
  popoverPopupVariants,
};
