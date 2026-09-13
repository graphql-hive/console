import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { useFloatingPortalContainer } from '../floating-portal-container';
import { type FloatingProps } from '../shared-styles';

/**
 * One delay for every tooltip in the app, set once on the provider. Libraries default to 600-700ms
 * (Base UI, Radix); dense product UIs run 0-300ms for icon hints. 300 keeps a hint from flashing
 * as the pointer crosses a row, and Base UI's grouping opens the next tooltip instantly once one
 * is showing, so a slow scan across a toolbar does not pay it more than once.
 */
const TOOLTIP_DELAY = 300;

/**
 * Mount once at the app root (and in foundry's provider). Tooltips share their delay and their
 * grouping through it; a tooltip rendered outside it still works but opens with Base UI's own
 * default delay instead.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider delay={TOOLTIP_DELAY}>{children}</BaseTooltip.Provider>;
}

/**
 * Smaller than the panels in `floatingVariants`: a tooltip explains the surface it sits over, so
 * it should not read as large as that surface.
 */
const popupClass =
  'rounded-md border text-xs shadow-md shadow-neutral-1/30 outline-none bg-neutral-4 border-neutral-5 text-neutral-11';

// `default` keeps a long explanation to a few lines rather than one wide band. `md` and `lg` are
// the two caps the legacy call sites reached for by hand; `screen` is for a value that must not
// wrap, such as a schema coordinate.
const maxWidthClass = {
  default: 'max-w-64',
  md: 'max-w-sm',
  lg: 'max-w-md',
  screen: 'max-w-[90vw]',
} as const;

const paddingClass = {
  default: 'px-2.5 py-1.5',
  /** For a paragraph rather than a label. */
  lg: 'p-4',
} as const;

type TooltipProps = Omit<FloatingProps, 'trigger'> & {
  /**
   * The element the hint belongs to. A string or number is wrapped in a focusable span so
   * keyboard users can reach it; an element is used as-is, so pass something focusable when the
   * hint matters.
   */
  trigger: ReactElement | string | number;
  /** What the tooltip says. Keep it to a sentence or two. */
  content: ReactNode;
  maxWidth?: keyof typeof maxWidthClass;
  padding?: keyof typeof paddingClass;
  /**
   * Turns the tooltip off without removing it from the tree, for a trigger whose explanation
   * only applies in some states.
   */
  disabled?: boolean;
  /** Point an arrow at the trigger. Off by default. */
  arrow?: boolean;
  defaultOpen?: boolean;
  /**
   * Close as soon as the pointer leaves the trigger instead of letting it travel into the popup.
   * For a tooltip over a row where the popup would cover the row beneath.
   */
  disableHoverablePopup?: boolean;
};

/**
 * A hover and focus hint attached to a trigger.
 *
 * The trigger must be able to receive hover: an element with `pointer-events-none`, such as a
 * disabled control, never fires one. Wrap it in a plain element and pass that instead.
 *
 * Not for an info icon whose only job is to open the hint; that is a Popover with a button.
 */
export function Tooltip({
  trigger,
  content,
  maxWidth = 'default',
  padding = 'default',
  disabled,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  arrow,
  open,
  defaultOpen,
  onOpenChange,
  disableHoverablePopup,
}: TooltipProps) {
  const portalContainer = useFloatingPortalContainer();
  const triggerElement = isValidElement(trigger) ? (
    trigger
  ) : (
    // The span exists to give a plain string a focus stop, so the hint is reachable by keyboard;
    // that is the one case where a tabIndex on a span is the point rather than a mistake.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <span tabIndex={0} className="inline-flex">
      {trigger}
    </span>
  );

  return (
    <BaseTooltip.Root
      disabled={disabled}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? next => onOpenChange(next) : undefined}
      disableHoverablePopup={disableHoverablePopup}
    >
      <BaseTooltip.Trigger render={triggerElement} />
      <BaseTooltip.Portal container={portalContainer ?? undefined}>
        <BaseTooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          // z-index goes here, not on the popup: the positioner is transformed for placement,
          // which makes it a stacking context that would trap a z-index set inside it.
          className="z-50 outline-none"
        >
          <BaseTooltip.Popup
            className={cn(popupClass, maxWidthClass[maxWidth], paddingClass[padding])}
          >
            {arrow ? <BaseTooltip.Arrow className="fill-neutral-4 stroke-neutral-5" /> : null}
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
