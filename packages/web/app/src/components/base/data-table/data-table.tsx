import { Fragment, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import {
  DataTableBody,
  DataTableCell,
  DataTableExpandedRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from './data-table-components';
import { DataTablePagination } from './data-table-pagination';

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageSize?: number;
  getRowId?: (row: TData) => string;
  emptyMessage?: string;
  /**
   * When provided, each row is expandable. Clicking the trailing chevron toggles
   * an inline panel rendered by this function.
   */
  renderSubComponent?: (row: Row<TData>) => ReactNode;
  /** Click handler invoked when a row is clicked (mutually exclusive with renderSubComponent). */
  onRowClick?: (row: TData) => void;
  /** Hide the trailing chevron indicator (rows stay clickable; hover signals interactivity). */
  hideRowIndicator?: boolean;
};

export function DataTable<TData>({
  data,
  columns,
  pageSize = 20,
  getRowId,
  emptyMessage = 'No rows to display.',
  renderSubComponent,
  onRowClick,
  hideRowIndicator = false,
}: DataTableProps<TData>) {
  const hasTrailingColumn = !hideRowIndicator && (!!renderSubComponent || !!onRowClick);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: renderSubComponent ? getExpandedRowModel() : undefined,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  const rows = table.getRowModel().rows;
  const totalColumnCount = columns.length + (hasTrailingColumn ? 1 : 0);

  return (
    <div className="border-neutral-5 bg-neutral-1 dark:bg-neutral-2 overflow-hidden rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm">
          <DataTableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <DataTableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <DataTableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </DataTableHead>
                ))}
                {hasTrailingColumn ? <DataTableHead compact /> : null}
              </DataTableRow>
            ))}
          </DataTableHeader>
          <DataTableBody>
            {rows.length === 0 ? (
              <DataTableRow>
                <DataTableCell colSpan={totalColumnCount} variant="empty">
                  {emptyMessage}
                </DataTableCell>
              </DataTableRow>
            ) : (
              rows.map(row => {
                const handleClick = renderSubComponent
                  ? () => row.toggleExpanded()
                  : onRowClick
                    ? () => onRowClick(row.original)
                    : undefined;
                return (
                  <Fragment key={row.id}>
                    <DataTableRow
                      data-state={row.getIsExpanded() ? 'expanded' : undefined}
                      onClick={handleClick}
                    >
                      {row.getVisibleCells().map(cell => (
                        <DataTableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </DataTableCell>
                      ))}
                      {hasTrailingColumn ? (
                        <DataTableCell variant="compact">
                          {renderSubComponent ? (
                            <ChevronDown
                              className={`size-4 transition-transform ${
                                row.getIsExpanded() ? 'rotate-180' : ''
                              }`}
                            />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </DataTableCell>
                      ) : null}
                    </DataTableRow>
                    {renderSubComponent && row.getIsExpanded() ? (
                      <DataTableExpandedRow colSpan={totalColumnCount}>
                        {renderSubComponent(row)}
                      </DataTableExpandedRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </DataTableBody>
        </table>
      </div>
      {table.getPageCount() > 1 ? (
        <DataTablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          onPageChange={page => table.setPageIndex(page)}
        />
      ) : null}
    </div>
  );
}
