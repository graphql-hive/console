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

/**
 * The surface a control sits on. `base` is the page background; `raised` is one step up, a card
 * or a floating panel. A control on a raised surface drops its fill so it does not stack a third
 * layer on top of the two already there, keeping only its border.
 *
 * Shared so every control names this the same way. The values differ per component, because a
 * button and a card on the same surface do not want the same classes; this is the vocabulary,
 * and `controlOnSurface` is the ladder for interactive controls specifically.
 */
export type OnSurface = 'base' | 'raised';

export const controlOnSurface = {
  base: '',
  raised: 'bg-transparent dark:bg-transparent hover:bg-neutral-3 dark:hover:bg-neutral-5',
} as const satisfies Record<OnSurface, string>;

/**
 * The two heights an interactive control comes in. `default` (36px) is a form control: an input,
 * a select, a button that submits or navigates. `compact` (30px) is filter chrome: the chips and
 * pickers in a toolbar above a table or chart, which sit in a dense row and read as one strip.
 *
 * Height and font size travel together so a control cannot be tall with small text or the other
 * way round. Padding does not, because it depends on what is inside the control (a segmented
 * trigger pads each segment; a plain button pads itself).
 */
export type ControlSize = 'compact' | 'default';

export const controlSize = {
  compact: 'h-7.5 text-[13px]',
  default: 'h-9 text-[13px]',
} as const satisfies Record<ControlSize, string>;
