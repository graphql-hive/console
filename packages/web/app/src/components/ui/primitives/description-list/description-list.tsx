import { Info } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { cn } from '@/lib/utils';
import { CopyChip } from '../copy-chip/copy-chip';
import { Tooltip } from '../floating/tooltip/tooltip';
import { descriptionListStyles } from './description-list.css';

const termVariants = lenient(descriptionListStyles.term);

const rowVariants = lenient(descriptionListStyles.row);

const cellVariants = lenient(descriptionListStyles.cell);

const valueVariants = lenient(descriptionListStyles.value);

type DescriptionListVariants = NonNullable<Parameters<typeof termVariants>[0]> &
  NonNullable<Parameters<typeof rowVariants>[0]>;

type DescriptionListItemProps = {
  term: string;
  description: React.ReactNode;
  /** Explains the term, on an info icon after it. */
  tooltip?: string;
  /** An identifier, endpoint or record value rather than prose. */
  mono?: boolean;
  /** A string description the reader will paste somewhere: rendered as a copy chip. */
  copyable?: boolean;
  /** Attributes for the value element, such as a hook for a test. */
  attrs?: Record<string, string>;
};

type DescriptionListItemRowProps = {
  items: Array<DescriptionListItemProps>;
};

type DescriptionListProps = {
  rows: Array<DescriptionListItemRowProps>;
  variants?: DescriptionListVariants;
};

/** The grid for a row's item count; a longer row folds to one column rather than squeezing. */
function columnsFor(count: number) {
  const { columns } = descriptionListStyles;
  return columns[count as keyof typeof columns] ?? columns[1];
}

function DescriptionListItem({
  term,
  description,
  tooltip,
  mono,
  copyable,
  attrs,
  termStyle,
}: DescriptionListItemProps & NonNullable<Parameters<typeof termVariants>[0]>) {
  const value =
    copyable && typeof description === 'string' ? (
      <CopyChip value={description} attrs={attrs} />
    ) : attrs ? (
      <span {...attrs}>{description}</span>
    ) : (
      description
    );
  return (
    <>
      <div className={termVariants({ termStyle })}>
        {term}
        {tooltip ? (
          <Tooltip
            trigger={
              <span className={descriptionListStyles.termHint}>
                <Info className={descriptionListStyles.termHintIcon} />
              </span>
            }
            content={tooltip}
          />
        ) : null}
      </div>
      <div
        className={valueVariants({ mono })}
        // A value that gets clipped by a narrow column can still be read on hover.
        title={typeof description === 'string' ? description : undefined}
      >
        {value}
      </div>
    </>
  );
}

export function DescriptionList({ rows, variants }: DescriptionListProps) {
  const columns = variants?.columns;
  return (
    <div className={descriptionListStyles.list}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            rowVariants({ columns }),
            columns !== 'auto' && columnsFor(row.items.length),
          )}
        >
          {row.items.map((item, itemIndex) => (
            <div key={itemIndex} className={cellVariants({ columns })}>
              <DescriptionListItem {...item} termStyle={variants?.termStyle} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
