import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function ChangeDocument(props: { children: ReactNode; className?: string }) {
  return (
    <table aria-label="change-document" className={cn('font-mono whitespace-pre min-w-full', props.className)}>
      <tbody>
        {props.children}
      </tbody>
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
      <td className='select-none w-[32px] p-1 text-gray-400 text-right'>{props.lineNumber}</td>
      <td className='select-none w-[32px] p-1 text-gray-400 text-right'>{props.lineNumber !== props.diffLineNumber ? props.diffLineNumber : null}</td>
      <td className='p-1'>{props.children}</td>
    </tr>
  );
}
