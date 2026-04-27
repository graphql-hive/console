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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="space-y-4">
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
              {renderSubComponent ? <TableHead className="w-10" aria-hidden /> : null}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumnCount} className="text-neutral-10 h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsExpanded() ? 'expanded' : undefined}
                  onClick={renderSubComponent ? () => row.toggleExpanded() : undefined}
                  className={
                    renderSubComponent
                      ? row.getIsExpanded()
                        ? 'bg-neutral-3 hover:bg-neutral-3 cursor-pointer'
                        : 'cursor-pointer'
                      : undefined
                  }
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  {renderSubComponent ? (
                    <TableCell className="text-neutral-10 w-10">
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          row.getIsExpanded() ? 'rotate-180' : ''
                        }`}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
                {renderSubComponent && row.getIsExpanded() ? (
                  <TableRow className="bg-neutral-3 hover:bg-neutral-3">
                    <TableCell colSpan={totalColumnCount} className="bg-neutral-3 p-0">
                      {renderSubComponent(row)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
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
