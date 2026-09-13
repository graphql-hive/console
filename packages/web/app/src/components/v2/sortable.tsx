import { ComponentProps, ReactElement, ReactNode } from 'react';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { TriangleUpIcon } from '@radix-ui/react-icons';
import { SortDirection } from '@tanstack/react-table';

export function Sortable(props: {
  children: ReactNode;
  sortOrder: SortDirection | false;
  onClick?: ComponentProps<'button'>['onClick'];
}): ReactElement {
  const tooltipText =
    props.sortOrder === false
      ? 'Click to sort descending'
      : {
          asc: 'Click to sort descending',
          desc: 'Click to sort ascending',
        }[props.sortOrder];

  return (
    <Tooltip
      trigger={
        <button
          type="button"
          className="inline-flex items-center justify-center"
          onClick={e => {
            e.stopPropagation();
            props.onClick?.(e);
          }}
        >
          <div>{props.children}</div>

          {props.sortOrder === 'asc' ? <TriangleUpIcon className="text-neutral-10 ml-2" /> : null}
          {props.sortOrder === 'desc' ? (
            <TriangleUpIcon className="text-neutral-10 ml-2 rotate-180" />
          ) : null}
        </button>
      }
      content={tooltipText}
    />
  );
}
