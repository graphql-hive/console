/**
 * Shared style tokens for base components (button segments, disabled state, etc.)
 *
 * Floating-specific styles (floating panel, items, scroll areas) live in
 * `./floating/shared-styles.ts`.
 */

// ---------------------------------------------------------------------------
// Segmented triggers (trigger-button, select trigger, filter-dropdown chip)
// ---------------------------------------------------------------------------

/** Separator between segments in a segmented trigger (label | icon, label | count | ×). */
export const segmentSeparator = 'border-l [border-left-color:inherit]';

/** Interactive segment within a segmented trigger (clickable text area). */
export const segmentButton =
  'px-2.5 py-1.5 text-[13px] transition-colors cursor-pointer hover:bg-neutral-4/50 hover:text-neutral-12';

/** Disabled styling for any interactive base component. */
export const disabledStyle = { opacity: 0.5, pointerEvents: 'none' } as const;
