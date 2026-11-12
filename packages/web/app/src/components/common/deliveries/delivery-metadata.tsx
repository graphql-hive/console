import type { ReactNode } from 'react';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';

/**
 * The expanded row of a deliveries table: what was recorded with the attempt, each value with a
 * copy button labelled by its key. `describe` may render a value as a link.
 */
export function DeliveryMetadata({
  title,
  metadata,
  describe,
}: {
  title: string;
  metadata: Record<string, unknown>;
  describe?: (key: string, value: string) => ReactNode;
}) {
  const entries = Object.entries(metadata).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const rows = entries.map(([key, value]) => ({
    items: [
      {
        term: key,
        description: (
          <span className="inline-flex items-center gap-1">
            {describe?.(key, value) ?? value}
            <CopyIconButton value={value} label={`Copy ${key.toUpperCase()}`} />
          </span>
        ),
        mono: true,
      },
    ],
  }));
  // Two columns on a wide window: key order runs down the left column, then the right.
  const split = Math.ceil(rows.length / 2);

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-xs font-medium text-fg-secondary">{title}</h3>
      <div className="grid gap-x-8 gap-y-3.5 xl:grid-cols-2">
        <DescriptionList rows={rows.slice(0, split)} />
        {rows.length > split ? <DescriptionList rows={rows.slice(split)} /> : null}
      </div>
    </div>
  );
}
