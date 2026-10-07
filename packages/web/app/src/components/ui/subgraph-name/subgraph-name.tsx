import { PackageIcon } from 'lucide-react';

/**
 * A subgraph's name wherever the UI mentions one. Neutral, not a semantic colour, so it never reads
 * as a verdict next to the warning and critical badges it tends to sit beside.
 */
export function SubgraphName(props: { name: string }) {
  return (
    <span
      className="bg-surface-control border-line-strong text-fg text-2xs relative -top-px inline-flex max-w-full items-stretch rounded-sm border align-middle font-mono font-medium leading-none"
      title={props.name}
    >
      <span className="flex items-center px-1">
        <PackageIcon className="size-2.5 shrink-0" />
      </span>
      <span className="border-line-strong min-w-0 truncate border-l px-1.5 py-[3px]">
        {props.name}
      </span>
    </span>
  );
}
