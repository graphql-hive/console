/**
 * Shared style tokens for base components (button segments, disabled state, etc.)
 *
 * Floating-specific styles (floating panel, items, scroll areas) live in
 * `./floating/shared-styles.ts`.
 */

/** Separator between segments in a segmented trigger (label | icon, label | count | ×). */
export const segmentSeparator = 'border-l [border-left-color:inherit]';

/** Interactive segment within a segmented trigger (clickable text area). */
export const segmentButton =
  'px-2.5 py-1.5 text-[13px] transition-colors cursor-pointer hover:bg-neutral-4/50 hover:text-neutral-12';

export const disabledStyle = { opacity: 0.5, pointerEvents: 'none' } as const;

/**
 * Vertical scroll container with a thin, muted scrollbar. Use anywhere content can overflow
 * (sheets, dialogs, floating lists). `thin-scrollbar` is a utility in `index.css` rather than
 * arbitrary Tailwind properties, because older Chromium and Safari need `::-webkit-scrollbar`
 * pseudo-elements that a class string cannot express.
 */
export const scrollArea = 'overflow-y-auto thin-scrollbar';
