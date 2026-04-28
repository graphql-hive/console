import { type ReactNode } from 'react';
import { FilterChips, FilterMenu } from './filter-menu';
import type { FilterDimension } from './types';

/**
 * Single composition for filter UIs across surfaces. Renders, in order:
 *   1. `FilterMenu` (the trigger that opens dimensions + any `extraSections`
 *      like saved-filter sub-menus). Trigger morphs to `activeLabel` + X
 *      when `activeLabel`/`onClearActive` are provided.
 *   2. `pinnedControls` — always-on controls (date range, view-range Select).
 *      These don't shift when chips appear.
 *   3. `FilterChips` — one chip per active dimension.
 *   4. `afterChips` — trailing controls (e.g. SaveFilterButton).
 */
export function Filters({
  dimensions,
  extraSections,
  pinnedControls,
  afterChips,
  activeLabel,
  onClearActive,
}: {
  dimensions: FilterDimension[];
  /** Forwarded to FilterMenu — e.g. saved-filter sub-menus + manage link. */
  extraSections?: Array<ReactNode | ReactNode[]>;
  /** Always-rendered controls between the trigger and the chips. */
  pinnedControls?: ReactNode;
  /** Rendered after the chips. */
  afterChips?: ReactNode;
  /** When set, the menu trigger shows this label and a clear-X (e.g. active saved view). */
  activeLabel?: string;
  /** Called when the trigger's X icon is clicked. */
  onClearActive?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <FilterMenu
        dimensions={dimensions}
        extraSections={extraSections}
        activeLabel={activeLabel}
        onClearActive={onClearActive}
      />
      {pinnedControls}
      <FilterChips dimensions={dimensions} />
      {afterChips}
    </div>
  );
}
