import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/base/button/button';

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
    <div className="border-critical_30 bg-critical_08 overflow-hidden rounded-md border">
      <div className="border-critical_30 flex items-center gap-2 border-b px-4 py-2.5">
        <AlertTriangle className="text-critical size-4 shrink-0" />
        <span className="text-neutral-12 text-sm font-medium">{title}</span>
        {aside ? <span className="text-neutral-10 ml-auto text-xs">{aside}</span> : null}
      </div>
      <ul className="divide-critical_30 divide-y">
        {items.map(item => (
          <li
            key={item.key}
            className="grid grid-cols-[10rem_1fr_auto] items-center gap-4 px-4 py-2 text-sm"
          >
            <span className="text-neutral-12 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="text-neutral-11">
              {item.reason}
              {item.detail ? <span className="text-neutral-10"> {item.detail}</span> : null}
            </span>
            {item.onView ? (
              <Button variant="outline" size="compact" onClick={item.onView}>
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
