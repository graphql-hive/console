import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ChangeDocument(props: { children: ReactNode; className?: string }) {
  return (
    <table
      aria-label="change-document"
      className={cn('min-w-full whitespace-pre font-mono', props.className)}
    >
      <tbody>{props.children}</tbody>
    </table>
  );
}

export function ChangeRow(props: {
  children: ReactNode;

  /** The line number for the current schema version */
  lineNumber: number;

  /** The line number associated for the proposed schema */
  diffLineNumber?: number;

  className?: string;
}) {
  return (
    <tr className={cn(props.lineNumber % 2 === 0 && 'bg-gray-900', props.className)}>
      <td className="w-[32px] select-none p-1 text-right text-gray-400">{props.lineNumber}</td>
      <td className="w-[32px] select-none p-1 text-right text-gray-400">
        {props.lineNumber !== props.diffLineNumber ? props.diffLineNumber : null}
      </td>
      <td className="p-1">{props.children}</td>
    </tr>
  );
}
