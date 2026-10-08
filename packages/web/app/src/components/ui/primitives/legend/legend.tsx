import { type ReactNode } from 'react';

export type LegendItem = {
  icon: ReactNode;
  label: string;
};

type LegendProps = {
  items: LegendItem[];
};

/**
 * A key to icons used nearby without their text: the status glyphs in a picker, the dots in a
 * table. Quiet and inline, so it sits at the end of a row above the thing it explains.
 */
export function Legend({ items }: LegendProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-secondary">
      {items.map(item => (
        <div key={item.label} className="inline-flex items-center gap-1.5">
          <dt className="inline-flex">{item.icon}</dt>
          <dd>{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}
