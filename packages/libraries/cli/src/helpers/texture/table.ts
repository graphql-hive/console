type Table<$Cell> = $Cell[][];

type Datum = string | number | Date;

export const table = (data: Table<Datum>): string => {
  const printedTable = mapTableCells(data, printCell);
  const columnWidths: number[] = [];
  for (let row of printedTable) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      columnWidths[i] = Math.max(columnWidths[i] || 0, cell.length);
    }
  }
  const totalWidth = columnWidths.reduce((acc, n) => acc + n, 0) + (columnWidths.length - 1) * 2;
  const divider = `${'-'.repeat(totalWidth)}\n`;

  const paddedTable = mapTableCells(printedTable, (cell, _, c) => cell.padEnd(columnWidths[c] + 2));
  return paddedTable.map(row => `${row.join('')}\n`).join(divider);
};

const printCell = (cell: Datum): string => {
  if (cell instanceof Date) {
    return cell.toISOString();
  }
  return String(cell);
};

const mapTableCells = <$CellInput, $CellOutput>(
  data: Table<$CellInput>,
  cellMapper: (cellDatum: $CellInput, rowIndex: number, colIndex: number) => $CellOutput,
): Table<$CellOutput> => {
  return data.map((row, rowIndex) =>
    row.map((cell, colIndex) => cellMapper(cell, rowIndex, colIndex)),
  );
};
