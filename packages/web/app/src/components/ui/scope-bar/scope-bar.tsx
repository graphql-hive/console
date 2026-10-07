import { type ReactNode } from 'react';
import { Legend, type LegendItem } from '../primitives/legend/legend';

type ScopeBarProps = {
  picker: ReactNode;
  label?: string;
  legend?: LegendItem[];
};

/** Sits above a TabbedView: the picker that scopes every tab, and the key to its glyphs. */
export function ScopeBar({ picker, label = 'Viewing', legend }: ScopeBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="text-control text-fg-secondary">{label}</span>
        {picker}
      </div>
      {legend?.length ? <Legend items={legend} /> : null}
    </div>
  );
}
