import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnSurface } from '../primitives/shared-styles';
import { dataTableComponentsStyles } from './data-table-components.css';

export type DataTableAlign = 'left' | 'center' | 'right';
export type DataTableWidth = 'xs' | 'sm' | 'md' | 'lg' | 'fill';
export type DataTableHideBelow = 'sm' | 'md';

/** Column layout, set once per column and applied to its header and every cell. */
export type DataTableColumnLayout = {
  align?: DataTableAlign;
  width?: DataTableWidth;
  hideBelow?: DataTableHideBelow;
};

function layoutClass(layout: DataTableColumnLayout | undefined) {
  if (!layout) return '';
  return cn(
    layout.align && dataTableComponentsStyles.align[layout.align],
    layout.width && dataTableComponentsStyles.width[layout.width],
    layout.hideBelow && dataTableComponentsStyles.hideBelow[layout.hideBelow],
  );
}

const surface = dataTableComponentsStyles.surface satisfies Record<
  OnSurface,
  Record<string, string>
>;

export type DataTableTone = 'default' | 'critical' | 'warning';

const toned = dataTableComponentsStyles.toned satisfies Record<
  Exclude<DataTableTone, 'default'>,
  Record<string, string>
>;

// A borderless table sits on whatever holds it, a popover or a panel, so it brings no fill.
export function wrapperClass(
  onSurface: OnSurface,
  bordered: boolean,
  tone: DataTableTone = 'default',
) {
  return cn(
    dataTableComponentsStyles.wrapper,
    bordered &&
      (tone === 'default'
        ? cn(dataTableComponentsStyles.wrapperBorder, surface[onSurface].wrapper)
        : cn(dataTableComponentsStyles.wrapperTonedBorder, toned[tone].wrapper)),
  );
}

export function DataTableTitleBar({
  label,
  icon: Icon,
  aside,
  tone = 'default',
}: {
  label: React.ReactNode;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  tone?: DataTableTone;
}) {
  return (
    <div
      className={cn(
        dataTableComponentsStyles.titleBar,
        tone === 'default' ? dataTableComponentsStyles.titleBarLine : toned[tone].titleLine,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            dataTableComponentsStyles.titleBarIcon,
            tone === 'default' ? dataTableComponentsStyles.titleBarIconMuted : toned[tone].icon,
          )}
        />
      ) : null}
      <span className={dataTableComponentsStyles.title}>{label}</span>
      {aside ? <span className={dataTableComponentsStyles.titleAside}>{aside}</span> : null}
    </div>
  );
}

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return <thead className={dataTableComponentsStyles.header}>{children}</thead>;
}

export function DataTableBody({
  children,
  refreshing = false,
}: {
  children: React.ReactNode;
  /** The rows are the last settled ones while their replacement loads. */
  refreshing?: boolean;
}) {
  return (
    <tbody
      className={cn(
        dataTableComponentsStyles.body,
        refreshing && dataTableComponentsStyles.bodyRefreshing,
      )}
    >
      {children}
    </tbody>
  );
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
  critical = false,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onSurface?: OnSurface;
  tone?: DataTableTone;
  /** This row takes the stripe tint. The table decides which rows, counting data rows only. */
  striped?: boolean;
  expanded?: boolean;
  /** The row the page is showing details for; brighter than hover so it survives the pointer leaving. */
  selected?: boolean;
  /** A row that is over, such as a solved ticket: text drops to fg-secondary. */
  muted?: boolean;
  /** A row that no longer applies, such as a disabled contract: faded, still readable. */
  disabled?: boolean;
  /** A row that needs attention, such as a disabled member: a critical tint over the stripe. */
  critical?: boolean;
}) {
  return (
    <tr
      data-state={expanded ? 'expanded' : selected ? 'selected' : undefined}
      onClick={onClick}
      className={cn(
        dataTableComponentsStyles.row,
        tone === 'default' ? dataTableComponentsStyles.rowLine : toned[tone].line,
        // Hover means "this row does something": only a clickable or expandable row gets it.
        onClick && (tone === 'default' ? surface[onSurface].hover : toned[tone].hover),
        // The critical tint replaces the stripe rather than layering on it.
        striped &&
          !critical &&
          (tone === 'default' ? surface[onSurface].stripe : toned[tone].stripe),
        critical && dataTableComponentsStyles.rowCritical,
        onClick && dataTableComponentsStyles.rowClickable,
        muted && dataTableComponentsStyles.rowMuted,
        disabled && dataTableComponentsStyles.rowDisabled,
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
  tone = 'default',
}: {
  children?: React.ReactNode;
  compact?: boolean;
  layout?: DataTableColumnLayout;
  onSurface?: OnSurface;
  tone?: DataTableTone;
}) {
  const head = tone === 'default' ? surface[onSurface].head : toned[tone].head;
  if (compact) {
    return <th className={cn(dataTableComponentsStyles.headCompact, head)} aria-hidden />;
  }
  return (
    <th className={cn(dataTableComponentsStyles.head, head, layoutClass(layout))}>{children}</th>
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
      ? dataTableComponentsStyles.cellCompact
      : variant === 'empty'
        ? dataTableComponentsStyles.cellEmpty
        : variant === 'panel'
          ? dataTableComponentsStyles.cellPanel
          : cn(dataTableComponentsStyles.cell, layoutClass(layout));
  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  );
}

export function DataTableExpandedRow({
  colSpan,
  children,
  tone = 'default',
}: {
  colSpan: number;
  children: React.ReactNode;
  tone?: DataTableTone;
}) {
  return (
    <tr
      className={cn(
        dataTableComponentsStyles.expandedRow,
        tone === 'default'
          ? dataTableComponentsStyles.expandedRowDefault
          : cn(toned[tone].line, toned[tone].head),
      )}
    >
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
  tone = 'default',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  columnCount: number;
  tone?: DataTableTone;
}) {
  return (
    <tfoot>
      <tr
        className={cn(
          dataTableComponentsStyles.footerRow,
          tone === 'default' ? dataTableComponentsStyles.footerRowLine : toned[tone].titleLine,
        )}
      >
        <td
          colSpan={Math.max(1, columnCount - 1)}
          className={dataTableComponentsStyles.footerLabel}
        >
          {label}
        </td>
        <td className={dataTableComponentsStyles.footerValue}>{value}</td>
      </tr>
    </tfoot>
  );
}
