import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';

export type FailureCardItem = {
  key: string;
  /** What failed: a contract, a subgraph, a service. */
  label: string;
  /** Why, in the words the CLI prints: "Composition failed." */
  reason: string;
  /** How much, quieter, after the reason: "2 errors". */
  detail?: string;
  /** Scopes the page to this item. Without it the row has no button. */
  onView?: () => void;
};

/** "2 errors", "1 breaking change": the `detail` a row shows after its reason. */
export function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

type FailureCardProps = {
  /** "2 of 11 contracts failed" */
  title: string;
  /** The far end of the header: "9 passed". */
  aside?: string;
  items: FailureCardItem[];
  /** The row button's text. */
  viewLabel?: string;
};

export function FailureCard({ title, aside, items, viewLabel = 'View' }: FailureCardProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="overflow-hidden rounded-md border border-critical-line bg-critical-tint-subtle">
      <div className="flex items-center gap-2 border-b border-critical-line px-4 py-2.5">
        <AlertTriangle className="size-4 shrink-0 text-critical" />
        <span className="text-sm font-medium text-fg">{title}</span>
        {aside ? <span className="ml-auto text-xs text-fg-secondary">{aside}</span> : null}
      </div>
      <ul className="divide-y divide-critical-line-subtle">
        {items.map(item => (
          <li
            key={item.key}
            className="grid grid-cols-[10rem_1fr_auto] items-center gap-4 px-4 py-2 text-sm"
          >
            <span className="truncate text-fg" title={item.label}>
              {item.label}
            </span>
            <span className="text-fg-default">
              {item.reason}
              {item.detail ? <span className="text-fg-secondary"> {item.detail}</span> : null}
            </span>
            {item.onView ? (
              <Button variant="ghost" size="compact" onClick={item.onView}>
                {viewLabel}
              </Button>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
