import { Anchor, cn } from '@theguild/components';
import { prettyPrintTag } from './pretty-print-tag';

export interface BlogTagChipProps {
  tag: string;
  colorScheme: 'default' | 'featured';
  inert?: boolean;
}

export function BlogTagChip({ tag, colorScheme, inert }: BlogTagChipProps) {
  const className = cn(
    'rounded-full px-3 py-1 text-white text-sm',
    colorScheme === 'featured'
      ? 'dark:bg-primary/90 dark:text-neutral-900 bg-green-800'
      : 'bg-beige-800 dark:bg-beige-800/40',
    !inert &&
      (colorScheme === 'featured'
        ? 'hover:bg-green-900 dark:hover:bg-primary'
        : 'hover:bg-beige-900 dark:hover:bg-beige-900/40'),
  );

  if (inert) {
    return <span className={className}>{prettyPrintTag(tag)}</span>;
  }

  return (
    <Anchor href={`/blog/tag/${tag}`} className={className}>
      {prettyPrintTag(tag)}
    </Anchor>
  );
}
