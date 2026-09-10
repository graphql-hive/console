import { type ReactElement, type ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { type FloatingProps } from '../shared-styles';

/**
 * Smaller than the panels in `floatingVariants`: a tooltip explains the surface it sits over, so
 * it should not read as large as that surface. `max-w-64` keeps a long explanation to a few
 * lines rather than one wide band across the viewport.
 */
const tooltipPopupClass =
  'z-50 max-w-64 rounded-md border px-2.5 py-1.5 text-xs shadow-md shadow-neutral-1/30 outline-none bg-neutral-4 border-neutral-5 text-neutral-11';

type TooltipProps = Omit<FloatingProps, 'open' | 'onOpenChange'> & {
  /** What the tooltip says. Keep it to a sentence or two. */
  content: ReactNode;
  /**
   * Wait before showing, in ms. Defaults to 200, which is long enough that the tooltip does not
   * flash while the pointer passes over on its way somewhere else.
   */
  delay?: number;
  /**
   * Turns the tooltip off without removing it from the tree, for a trigger whose explanation
   * only applies in some states.
   */
  disabled?: boolean;
  /** Point an arrow at the trigger. Off by default. */
  arrow?: boolean;
};

/**
 * A hover and focus hint attached to a trigger.
 *
 * The trigger must be able to receive hover: an element with `pointer-events-none`, such as a
 * disabled control, never fires one. Wrap it in a plain element and pass that instead.
 */
export function Tooltip({
  trigger,
  content,
  delay = 200,
  disabled,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  arrow,
}: TooltipProps) {
  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root disabled={disabled}>
        <BaseTooltip.Trigger render={trigger as ReactElement} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            className="outline-none"
          >
            <BaseTooltip.Popup className={tooltipPopupClass}>
              {arrow ? <BaseTooltip.Arrow className="fill-neutral-4 stroke-neutral-5" /> : null}
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}
