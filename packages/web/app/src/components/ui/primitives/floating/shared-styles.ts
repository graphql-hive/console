/**
 * Shared style tokens for floating/overlay components (popover, menu, select, filter-dropdown, etc.)
 *
 * These are the common visual building blocks used across all floating
 * components. Centralizing them ensures visual consistency and makes it easy
 * to update the design system in one place.
 */

import { lenient } from '@/lib/recipe';
import * as styles from './shared-styles.css';

/**
 * The inset of a panel made of menu rows: sides and bottom only, because the first row brings the
 * top inset itself (`first:mt-2`). A custom panel dropped into a Menu (`content` rather than
 * `sections`) gets no padding from the popup and applies this itself, so a search field can bleed
 * to the edges with `-mx-2` in either case.
 */
export const menuPanelInset = styles.menuPanelInset;

/** Base classes shared by all floating panels (menu, select, popover). */
export const floatingBaseClass =
  // No z-index here. The positioner is transformed for placement, which makes it a stacking
  // context, so a z-index on the popup would only compete inside it and lose to any page
  // element that outranks the positioner. It goes on the positioner instead.
  styles.floatingBaseClass;

export const floatingVariants = lenient(styles.floatingVariants);

export const itemVariants = lenient(styles.itemVariants);

/** Common props shared by all floating components (popover, menu, select). */
export type FloatingProps = {
  /**
   * Element that triggers the floating panel.
   *
   * A function when the trigger has to be composed with another wrapper that owns the same
   * element. `GraphiQLTooltip` in `pages/target-laboratory.tsx` is the case this exists for: it
   * destructures only `{ children, align, side, sideOffset, label }` and forwards nothing, so
   * passing it as an element would swallow the trigger props and the panel would never open.
   * Given a function you apply the props yourself, and any wrapper can sit outside:
   *
   * ```tsx
   * trigger={props => (
   *   <GraphiQLTooltip label={label}>
   *     <GraphiQLButton {...props} />
   *   </GraphiQLTooltip>
   * )}
   * ```
   */
  // `any` on the params because this has to satisfy every Base UI trigger, and each one has its
  // own props and state types that the package does not export a subpath for.
  trigger: React.ReactElement | ((props: any, state: any) => React.ReactElement);
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

/** Scrollbar styling for lists inside floating panels. */
export { scrollArea as floatingScrollArea } from '../shared-styles';

/** Empty state text inside a floating panel. */
export const floatingEmptyState = styles.floatingEmptyState;
