import { PackageIcon } from 'lucide-react';

/**
 * A subgraph's name wherever the UI mentions one. Neutral, not a semantic colour, so it never reads
 * as a verdict next to the warning and critical badges it tends to sit beside.
 */
export function SubgraphName(props: { name: string }) {
  return (
    <span
      className="relative -top-px inline-flex max-w-full items-stretch rounded-sm border border-line-strong bg-surface-control align-middle font-mono text-2xs leading-none font-medium text-fg"
      title={props.name}
    >
      <span className="flex items-center px-1">
        <PackageIcon className="size-2.5 shrink-0" />
      </span>
      <span className="min-w-0 truncate border-l border-line-strong px-1.5 py-[3px]">
        {props.name}
      </span>
    </span>
  );
}
