import { PackageIcon } from 'lucide-react';
import { subgraphNameStyles } from './subgraph-name.css';

/**
 * A subgraph's name wherever the UI mentions one. Neutral, not a semantic colour, so it never reads
 * as a verdict next to the warning and critical badges it tends to sit beside.
 */
export function SubgraphName(props: { name: string }) {
  return (
    <span className={subgraphNameStyles.root} title={props.name}>
      <span className={subgraphNameStyles.iconCell}>
        <PackageIcon className={subgraphNameStyles.icon} />
      </span>
      <span className={subgraphNameStyles.name}>{props.name}</span>
    </span>
  );
}
