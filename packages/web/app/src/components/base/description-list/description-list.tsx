import { cn } from '@/lib/utils';
import { CopyChip } from '../copy-chip/copy-chip';

type DescriptionListItemProps = {
  term: string;
  description: React.ReactNode;
  /** An identifier, endpoint or record value rather than prose. */
  mono?: boolean;
  /** A string description the reader will paste somewhere: rendered as a copy chip. */
  copyable?: boolean;
};

type DescriptionListItemRowProps = {
  items: Array<DescriptionListItemProps>;
};

type DescriptionListProps = {
  rows: Array<DescriptionListItemRowProps>;
};

// Tailwind needs full class strings to detect them — explicit map by column count.
const COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

function DescriptionListItem({ term, description, mono, copyable }: DescriptionListItemProps) {
  const value =
    copyable && typeof description === 'string' ? <CopyChip value={description} /> : description;
  return (
    <>
      <div className="text-neutral-10 mb-1 inline-block text-[9px] font-medium uppercase tracking-[0.75px]">
        {term}
      </div>
      <div className={cn('text-neutral-12 text-control', mono && !copyable && 'font-mono')}>
        {value}
      </div>
    </>
  );
}

export function DescriptionList({ rows }: DescriptionListProps) {
  return (
    <div className="space-y-3.5">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid gap-4 ${COLS_CLASS[row.items.length] ?? 'grid-cols-1'}`}
        >
          {row.items.map((item, itemIndex) => (
            <div key={itemIndex}>
              <DescriptionListItem
                term={item.term}
                description={item.description}
                mono={item.mono}
                copyable={item.copyable}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
