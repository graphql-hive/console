import { ComponentProps, ReactElement, ReactNode } from 'react';
import { Tooltip } from '@/components/v2/tooltip';
import { TriangleUpIcon } from '@radix-ui/react-icons';
import { SortDirection } from '@tanstack/react-table';

export function Sortable({
  children,
  sortOrder,
  hasOtherSorting,
  onClick,
}: {
  children: ReactNode;
  sortOrder: SortDirection | false;
  hasOtherSorting?: boolean;
  onClick: ComponentProps<'button'>['onClick'];
}): ReactElement {
  const tooltipText =
    sortOrder === false
      ? 'Click to sort descending' + hasOtherSorting
        ? ' (hold shift to sort by multiple columns)'
        : ''
      : {
          asc: 'Click to cancel sorting',
          desc: 'Click to sort ascending',
        }[sortOrder];

  return (
    <Tooltip content={tooltipText}>
      <button className="flex items-center justify-center" onClick={onClick}>
        <div>{children}</div>

        {sortOrder === 'asc' ? <TriangleUpIcon className="ml-2 text-orange-500" /> : null}
        {sortOrder === 'desc' ? (
          <TriangleUpIcon className="ml-2 rotate-180 text-orange-500" />
        ) : null}
      </button>
    </Tooltip>
  );
}
