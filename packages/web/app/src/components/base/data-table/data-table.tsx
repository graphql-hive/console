import { Fragment, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableExpandedRow,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/base/table/table';
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
};

export function DataTable<TData>({
  data,
  columns,
  pageSize = 10,
  getRowId,
  emptyMessage = 'No rows to display.',
  renderSubComponent,
}: DataTableProps<TData>) {
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
  const totalColumnCount = columns.length + (renderSubComponent ? 1 : 0);

  return (
    <div className="border-neutral-4 overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
              {renderSubComponent ? <TableHead compact /> : null}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumnCount} variant="empty">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsExpanded() ? 'expanded' : undefined}
                  onClick={renderSubComponent ? () => row.toggleExpanded() : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  {renderSubComponent ? (
                    <TableCell variant="compact">
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          row.getIsExpanded() ? 'rotate-180' : ''
                        }`}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
                {renderSubComponent && row.getIsExpanded() ? (
                  <TableExpandedRow colSpan={totalColumnCount}>
                    {renderSubComponent(row)}
                  </TableExpandedRow>
                ) : null}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
      {table.getPageCount() > 1 ? (
        <div className="border-neutral-4 border-t">
          <DataTablePagination
            pageIndex={table.getState().pagination.pageIndex}
            pageCount={table.getPageCount()}
            onPageChange={page => table.setPageIndex(page)}
          />
        </div>
      ) : null}
    </div>
  );
}
