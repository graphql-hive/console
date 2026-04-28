import type React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="[&_tr:hover]:bg-transparent">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:last-child]:border-0">{children}</tbody>;
}

const TINT_CLASSES = {
  critical:
    'bg-critical_08 hover:bg-critical_10 data-[state=expanded]:bg-critical_10 data-[state=expanded]:hover:bg-critical_10',
  warning:
    'bg-warning_08 hover:bg-warning_10 data-[state=expanded]:bg-warning_10 data-[state=expanded]:hover:bg-warning_10',
  info: 'bg-info_08 hover:bg-info_10 data-[state=expanded]:bg-info_10 data-[state=expanded]:hover:bg-info_10',
  success:
    'bg-success_08 hover:bg-success_10 data-[state=expanded]:bg-success_10 data-[state=expanded]:hover:bg-success_10',
} as const;

export type TableRowTint = keyof typeof TINT_CLASSES;

export function TableRow({
  children,
  onClick,
  'data-state': dataState,
  tint,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  'data-state'?: 'expanded';
  tint?: TableRowTint;
}) {
  const palette = tint
    ? TINT_CLASSES[tint]
    : 'hover:bg-neutral-3/40 data-[state=expanded]:bg-neutral-3 data-[state=expanded]:hover:bg-neutral-3';
  const base =
    'border-neutral-4 data-[state=expanded]:border-b-0 border-b transition-colors';
  const interactive = onClick ? ' cursor-pointer' : '';
  return (
    <tr
      data-state={dataState}
      onClick={onClick}
      className={`${palette} ${base}${interactive}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  compact,
}: {
  children?: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return <th className="bg-neutral-3 h-10 w-10" aria-hidden />;
  }
  return (
    <th className="bg-neutral-3 text-neutral-10 h-10 px-4 text-left align-middle text-xs font-medium">
      {children}
    </th>
  );
}

export function TableCell({
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
          ? 'bg-neutral-3 p-0 align-middle'
          : 'h-12 px-4 align-middle';
  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  );
}

export function TableExpandedRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr className="bg-neutral-3">
      <TableCell colSpan={colSpan} variant="panel">
        {children}
      </TableCell>
    </tr>
  );
}
