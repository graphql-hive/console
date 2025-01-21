import { ComponentProps, ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TriangleUpIcon } from '@radix-ui/react-icons';
import { SortDirection } from '@tanstack/react-table';

export function Sortable(props: {
  children: ReactNode;
  sortOrder: SortDirection | false;
  /**
   * Whether another column is sorted in addition to this one.
   * It's used to show a different tooltip when sorting by multiple columns.
   */
  otherColumnSorted?: boolean;
  onClick?: ComponentProps<'button'>['onClick'];
}): ReactElement {
  const tooltipText =
    props.sortOrder === false
      ? 'Click to sort descending' + props.otherColumnSorted
        ? ' (hold shift to sort by multiple columns)'
        : ''
      : {
          asc: 'Click to cancel sorting',
          desc: 'Click to sort ascending',
        }[props.sortOrder];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center justify-center"
            onClick={e => {
              e.stopPropagation();
              props.onClick?.(e);
            }}
          >
            <div>{props.children}</div>

            {props.sortOrder === 'asc' ? <TriangleUpIcon className="ml-2 text-orange-500" /> : null}
            {props.sortOrder === 'desc' ? (
              <TriangleUpIcon className="ml-2 rotate-180 text-orange-500" />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
