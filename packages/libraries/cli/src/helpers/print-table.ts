type TableCell = string | number | Date;
type Table = TableCell[][];

function printCell(cell: TableCell): string {
  if (cell instanceof Date) {
    return cell.toISOString();
  }
  return String(cell);
}

function mapTable<T, O>(table: T[][], map: (cell: T, row: number, col: number) => O): O[][] {
  return table.map((row, r) => row.map((cell, c) => map(cell, r, c)));
}

export function printTable(table: Table) {
  const printedTable = mapTable(table, printCell);
  const columnWidths: number[] = [];
  for (let row of printedTable) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      columnWidths[i] = Math.max(columnWidths[i] || 0, cell.length);
    }
  }
  const totalWidth = columnWidths.reduce((acc, n) => acc + n, 0) + (columnWidths.length - 1) * 2;
  const divider = `${'-'.repeat(totalWidth)}\n`;

  const paddedTable = mapTable(printedTable, (cell, r, c) => cell.padEnd(columnWidths[c] + 2));
  return paddedTable.map(row => `${row.join('')}\n`).join(divider);
}
