'use client';

import { ReactNode } from 'react';
import { cn, Heading, ComparisonTable as Table } from '@theguild/components';
import { CheckmarkIcon, XIcon } from '../../../components/icons';
import { NestedSticky } from '../../../components/nested-sticky';
import { TableSubheaderRow } from '../../../components/pricing/table-subheader-row';

const NO = <XIcon className="text-critical-dark mx-auto size-6" />;
const YES = <CheckmarkIcon className="text-positive-dark mx-auto size-6" />;

export type ComparisonColumn = {
  name: string;
  icon?: ReactNode;
};

export type ComparisonSection = {
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  rows: ComparisonRow[];
};

export type ComparisonRow = {
  feature: string;
  values: (ReactNode | boolean)[];
};

export type ComparisonTableProps = {
  className?: string;
  columns: ComparisonColumn[];
  sections: ComparisonSection[];
};

export function ComparisonTable({ className, columns, sections }: ComparisonTableProps) {
  return (
    <section className={cn('relative p-4 py-12', className)}>
      <Heading size="md" as="h2" className="mx-auto w-[940px] max-w-full text-pretty text-center">
        Hive Gateway allows you to do so much more. On your own terms.
      </Heading>
      <p className="mt-4 text-center text-green-800">
        Part of the Hive ecosystem, Hive Gateway is a fully-fledged solution that you can easily
        tailor to your needs.
      </p>

      <div className="md:nextra-scrollbar mt-16 md:-mx-6 md:overflow-x-auto md:px-6">
        <NestedSticky offsetTop={80} offsetBottom={90}>
          <div
            aria-hidden
            className="bg-beige-100 [[data-sticky]>&]:border-beige-200 relative flex items-center rounded-3xl border border-transparent *:w-1/3 *:text-left [[data-sticky]>&]:rounded-t-none [[data-sticky]>&]:shadow-sm"
          >
            <div className="z-10 rounded-l-3xl p-6 text-xl/6 font-normal">Compare features</div>
            {columns.map(column => (
              <div className="py-6 last:rounded-r-3xl" key={column.name}>
                <div className="border-beige-400 flex items-center justify-center gap-4 border-l px-6">
                  {column.icon && <div className="mr-2 *:size-10">{column.icon}</div>}
                  <div className="text-xl/6 font-medium">{column.name}</div>
                </div>
              </div>
            ))}
          </div>
        </NestedSticky>

        <Table
          scheme="green"
          className="table w-full border-separate border-spacing-0 border-none [&_tbody_tr>:last-child:not(:first-child)]:bg-green-100"
        >
          <thead className="sr-only">
            <tr>
              <th>Compare features</th>
              {columns.map((column, i) => (
                <th key={i}>{column.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section, sectionIndex) => (
              <>
                <TableSubheaderRow
                  key={`header-${sectionIndex}`}
                  icon={section.icon}
                  title={section.title}
                  description={section.description}
                />
                {section.rows.map((row, rowIndex) => (
                  <tr key={`${sectionIndex}-${rowIndex}`}>
                    <ComparisonTableCell className="whitespace-pre">
                      {row.feature}
                    </ComparisonTableCell>
                    {row.values.map((value, columnIndex) => (
                      <ComparisonTableCell key={columnIndex}>
                        {typeof value === 'boolean' ? (value ? YES : NO) : value}
                      </ComparisonTableCell>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
}

function ComparisonTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        'border-beige-400 border-b border-r p-4 first:border-l first:font-medium max-md:w-1/2 max-sm:text-sm sm:py-6 md:w-1/4 [&:not(:first-child)]:border-l-0 [&:not(:first-child)]:text-center [&:not(:first-child)]:text-sm [&:not(:first-child)]:text-green-800 md:[.subheader+tr>&:last-child]:rounded-tr-3xl max-md:[.subheader+tr>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-tr-3xl [.subheader+tr>&]:border-t [.subheader+tr>&]:first:rounded-tl-3xl md:[tr:is(:has(+.subheader),:last-child)>&:last-child]:rounded-br-3xl max-md:[tr:is(:has(+.subheader),:last-child)>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-br-3xl [tr:is(:last-child,:has(+.subheader))>&]:first:rounded-bl-3xl',
        className,
      )}
    >
      {children}
    </td>
  );
}
