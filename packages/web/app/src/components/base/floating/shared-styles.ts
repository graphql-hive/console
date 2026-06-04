/**
 * Shared style tokens for floating/overlay components (popover, menu, select, filter-dropdown, etc.)
 *
 * These are the common visual building blocks used across all floating
 * components. Centralizing them ensures visual consistency and makes it easy
 * to update the design system in one place.
 */
import { cva } from 'class-variance-authority';

// ---------------------------------------------------------------------------
// Floating panel
// ---------------------------------------------------------------------------

/** Base classes shared by all floating panels (menu, select, popover). */
export const floatingBaseClass =
  'z-50 text-[13px] rounded-md border shadow-md shadow-neutral-1/30 outline-none bg-neutral-2 border-neutral-5 dark:bg-neutral-4 dark:border-neutral-5';

/** Floating panel variant with configurable padding and width constraints. */
export const floatingVariants = cva(floatingBaseClass, {
  variants: {
    padding: {
      none: '',
      sm: 'px-1 py-1',
      md: 'px-2 py-2',
      /** Menu-style: top padding handled by first:mt-2 on items */
      menu: 'px-2 pb-2',
    },
    maxWidth: {
      default: 'max-w-75',
      none: 'max-w-none',
      sm: 'max-w-60',
      lg: 'max-w-[380px]',
    },
    minWidth: {
      default: 'min-w-[12rem]',
      none: 'min-w-0',
    },
  },
  defaultVariants: {
    padding: 'sm',
    maxWidth: 'none',
    minWidth: 'none',
  },
});

// ---------------------------------------------------------------------------
// Items (menu items, select items, filter list items, etc.)
// ---------------------------------------------------------------------------

/** Base classes shared by all interactive list items. */
export const itemVariants = cva(
  'flex h-7 cursor-pointer select-none items-center rounded-sm outline-none gap-2',
  {
    variants: {
      variant: {
        default: 'px-2 text-neutral-10',
        navigationLink: 'hover:text-accent text-accent_80 justify-end pr-2 hover:bg-transparent',
        action: 'pl-2 hover:bg-accent_10 hover:text-accent text-accent_80',
        destructiveAction: 'pl-2 text-red-400 hover:bg-red-300/10',
      },
      highlighted: {
        true: 'bg-neutral-5 text-neutral-12',
        false: '',
      },
      selected: {
        true: 'text-neutral-12',
        false: '',
      },
      disabled: {
        true: 'pointer-events-none opacity-50',
        false: '',
      },
    },
    compoundVariants: [{ highlighted: true, className: 'bg-neutral-5 text-neutral-12' }],
    defaultVariants: {
      variant: 'default',
      highlighted: false,
      selected: false,
      disabled: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Shared floating component props
// ---------------------------------------------------------------------------

/** Common props shared by all floating components (popover, menu, select). */
export type FloatingProps = {
  /** Element that triggers the floating panel */
  trigger: React.ReactElement;
  /** Which side of the trigger to position on */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment along the side */
  align?: 'start' | 'center' | 'end';
  /** Gap between trigger and popup in px */
  sideOffset?: number;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Scrollable lists inside floating panels
// ---------------------------------------------------------------------------

/** Scrollbar styling for lists inside floating panels. */
export const floatingScrollArea =
  'overflow-y-auto [scrollbar-color:var(--color-neutral-7)_transparent] [scrollbar-width:thin]';

/** Empty state text inside a floating panel. */
export const floatingEmptyState = 'text-neutral-8 px-2 py-4 text-center text-sm italic';
