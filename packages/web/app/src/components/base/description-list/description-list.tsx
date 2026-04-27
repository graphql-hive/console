type DescriptionListItemProps = {
  term: string;
  description: React.ReactNode;
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

function DescriptionListItem({ term, description }: DescriptionListItemProps) {
  return (
    <>
      <div className="text-neutral-10 mb-1 inline-block text-[9px] font-medium uppercase tracking-[0.75px]">
        {term}
      </div>
      <div className="text-neutral-12 text-[13px]">{description}</div>
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
              <DescriptionListItem term={item.term} description={item.description} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
