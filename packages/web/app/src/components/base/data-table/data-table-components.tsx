import type React from 'react';

export function DataTableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="[&_tr:hover]:bg-transparent">{children}</thead>;
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:last-child]:border-0">{children}</tbody>;
}

export function DataTableRow({
  children,
  onClick,
  'data-state': dataState,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  'data-state'?: 'expanded';
}) {
  const base =
    'border-neutral-5 hover:bg-neutral-3 dark:hover:bg-neutral-3 data-[state=expanded]:bg-neutral-3 data-[state=expanded]:border-b-0 border-b transition-colors';
  const interactive = onClick ? ' cursor-pointer' : '';
  return (
    <tr data-state={dataState} onClick={onClick} className={base + interactive}>
      {children}
    </tr>
  );
}

export function DataTableHead({
  children,
  compact,
}: {
  children?: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return <th className="bg-neutral-2 dark:bg-neutral-3 h-10 w-10" aria-hidden />;
  }
  return (
    <th className="bg-neutral-2 dark:bg-neutral-3 text-neutral-10 h-10 px-4 text-left align-middle text-xs font-medium">
      {children}
    </th>
  );
}

export function DataTableCell({
  children,
  colSpan,
  variant,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  variant?: 'compact' | 'empty' | 'panel';
}) {
  const className =
    variant === 'compact'
      ? 'text-neutral-10 h-12 w-10 px-2 align-middle'
      : variant === 'empty'
        ? 'text-neutral-10 h-24 text-center align-middle'
        : variant === 'panel'
          ? 'bg-neutral-2 p-0 align-middle'
          : 'h-12 px-4 align-middle';
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
    <tr className="bg-neutral-2">
      <DataTableCell colSpan={colSpan} variant="panel">
        {children}
      </DataTableCell>
    </tr>
  );
}
