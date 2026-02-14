import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Popover as BasePopover } from '@base-ui/react/popover';

const popoverPopupVariants = cva('z-50 rounded-md border shadow-md outline-none', {
  variants: {
    variant: {
      default: 'bg-neutral-2 border-neutral-4 dark:bg-neutral-2 dark:border-neutral-4',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type PopoverProps = {
  /** Element that triggers the popover on click */
  trigger: React.ReactElement;
  /** Content to render inside the popup */
  content: React.ReactNode;
  /** Which side of the trigger to position on */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment along the side */
  align?: 'start' | 'center' | 'end';
  /** Gap between trigger and popup in px */
  sideOffset?: number;
  /** Visual variant */
  variant?: VariantProps<typeof popoverPopupVariants>['variant'];
  /** Show an arrow pointing to the trigger */
  arrow?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
};

export function Popover({
  trigger,
  content,
  side = 'bottom',
  align,
  sideOffset = 8,
  variant,
  arrow,
  open,
  onOpenChange,
}: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="outline-none"
        >
          <BasePopover.Popup className={popoverPopupVariants({ variant })}>
            {arrow && <PopoverArrow />}
            {content}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

function PopoverArrow() {
  return (
    <BasePopover.Arrow
      className={cn(
        'group',
        'data-[side=bottom]:bottom-[calc(100%-2px)]',
        'data-[side=top]:top-[calc(100%-2px)]',
        'data-[side=left]:left-[calc(100%-8px)]',
        'data-[side=right]:right-[calc(100%-8px)]',
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="8"
        fill="none"
        viewBox="0 0 20 8"
        className={cn(
          'block',
          'group-data-[side=top]:rotate-180',
          'group-data-[side=left]:rotate-90',
          'group-data-[side=right]:-rotate-90',
        )}
      >
        <path
          className="fill-neutral-2"
          d="M9.664.602 4.808 4.973A4 4 0 0 1 2.132 6H0v2h20V6h-1.465a4 4 0 0 1-2.676-1.027L11.002.603a1 1 0 0 0-1.338 0"
        />
        <path
          className="fill-neutral-4"
          d="M10.333 1.345 5.477 5.716A5 5 0 0 1 2.132 7H0V6h2.132a4 4 0 0 0 2.676-1.027L9.664.603a1 1 0 0 1 1.338 0l4.857 4.37A4 4 0 0 0 18.535 6H20v1h-1.465a5 5 0 0 1-3.345-1.284z"
        />
      </svg>
    </BasePopover.Arrow>
  );
}
