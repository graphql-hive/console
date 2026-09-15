import type React from 'react';
import { cn } from '@/lib/utils';
import type { OnSurface } from '../shared-styles';

export type DataTableAlign = 'left' | 'center' | 'right';
export type DataTableWidth = 'xs' | 'sm' | 'md' | 'lg' | 'fill';
export type DataTableHideBelow = 'sm' | 'md';

/** Column layout, set once per column and applied to its header and every cell. */
export type DataTableColumnLayout = {
  align?: DataTableAlign;
  width?: DataTableWidth;
  hideBelow?: DataTableHideBelow;
};

const alignClass: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const widthClass: Record<DataTableWidth, string> = {
  xs: 'w-16',
  sm: 'w-32',
  md: 'w-48',
  lg: 'w-64',
  fill: 'w-full',
};

const hideBelowClass: Record<DataTableHideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
};

function layoutClass(layout: DataTableColumnLayout | undefined) {
  if (!layout) return '';
  return cn(
    layout.align && alignClass[layout.align],
    layout.width && widthClass[layout.width],
    layout.hideBelow && hideBelowClass[layout.hideBelow],
  );
}

// The surface ladder for the table's own chrome. The wrapper sits one step off the page and the
// header one more; a raised table (in a sheet, dialog or raised card) starts one step higher.
const surface = {
  base: {
    wrapper: 'bg-neutral-1 dark:bg-neutral-2',
    head: 'bg-neutral-2 dark:bg-neutral-3',
    stripe: 'even:bg-neutral-2/60 dark:even:bg-neutral-3/60',
    hover: 'hover:bg-neutral-3 dark:hover:bg-neutral-4',
  },
  raised: {
    wrapper: 'bg-neutral-2 dark:bg-neutral-3',
    head: 'bg-neutral-3 dark:bg-neutral-4',
    stripe: 'even:bg-neutral-3/60 dark:even:bg-neutral-4/60',
    hover: 'hover:bg-neutral-4 dark:hover:bg-neutral-5',
  },
} as const satisfies Record<OnSurface, Record<string, string>>;

export function wrapperClass(onSurface: OnSurface, bordered: boolean) {
  return cn(
    'overflow-hidden rounded-md',
    bordered && 'border-neutral-5 border',
    surface[onSurface].wrapper,
  );
}

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="[&_tr:hover]:bg-transparent [&_tr:nth-child(even)]:bg-transparent">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:last-child]:border-0">{children}</tbody>;
}

export function DataTableRow({
  children,
  onClick,
  onSurface = 'base',
  striped = false,
  expanded = false,
  selected = false,
  muted = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onSurface?: OnSurface;
  striped?: boolean;
  expanded?: boolean;
  /** The row the page is showing details for; brighter than hover so it survives the pointer leaving. */
  selected?: boolean;
  /** A row that is over, such as a solved ticket: text drops to neutral-10. */
  muted?: boolean;
  /** A row that no longer applies, such as a disabled contract: faded, still readable. */
  disabled?: boolean;
}) {
  return (
    <tr
      data-state={expanded ? 'expanded' : selected ? 'selected' : undefined}
      onClick={onClick}
      className={cn(
        'border-neutral-5 border-b transition-colors',
        surface[onSurface].hover,
        striped && surface[onSurface].stripe,
        'data-[state=expanded]:bg-neutral-3 data-[state=expanded]:border-b-0',
        'data-[state=selected]:bg-neutral-12/10 dark:data-[state=selected]:bg-neutral-12/10',
        onClick && 'cursor-pointer',
        muted && 'text-neutral-10',
        disabled && 'opacity-40',
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableHead({
  children,
  compact,
  layout,
  onSurface = 'base',
}: {
  children?: React.ReactNode;
  compact?: boolean;
  layout?: DataTableColumnLayout;
  onSurface?: OnSurface;
}) {
  if (compact) {
    return <th className={cn('h-10 w-10', surface[onSurface].head)} aria-hidden />;
  }
  return (
    <th
      className={cn(
        'text-neutral-10 h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-normal',
        surface[onSurface].head,
        layoutClass(layout),
      )}
    >
      {children}
    </th>
  );
}

export function DataTableCellSlot({
  children,
  colSpan,
  variant,
  layout,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  variant?: 'compact' | 'empty' | 'panel';
  layout?: DataTableColumnLayout;
}) {
  const className =
    variant === 'compact'
      ? 'text-neutral-10 h-12 w-10 px-2 align-middle'
      : variant === 'empty'
        ? 'text-neutral-10 h-24 text-center align-middle'
        : variant === 'panel'
          ? 'p-0 align-middle'
          : // Cells keep their content on one line; a `fill` column absorbs the width and a cell
            // that opts into `truncate` gives way, so a short value never breaks mid-phrase.
            cn('h-12 whitespace-nowrap px-4 align-middle', layoutClass(layout));
  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  );
}

export function DataTableExpandedRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr className="bg-neutral-3 border-neutral-5 border-b">
      <DataTableCellSlot colSpan={colSpan} variant="panel">
        {children}
      </DataTableCellSlot>
    </tr>
  );
}

export function DataTableFooterRow({
  label,
  value,
  columnCount,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  columnCount: number;
}) {
  return (
    <tfoot>
      <tr className="border-neutral-5 border-t">
        <td
          colSpan={Math.max(1, columnCount - 1)}
          className="text-neutral-12 h-12 px-4 align-middle font-medium"
        >
          {label}
        </td>
        <td className="text-neutral-12 h-12 px-4 text-right align-middle font-medium">{value}</td>
      </tr>
    </tfoot>
  );
}
