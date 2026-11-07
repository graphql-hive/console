import { ReactElement, ReactNode } from 'react';
import { CodeScrollArea, File } from '@/components/ui/diffs';
import { Card } from '@/components/ui/primitives/card/card';
import { usePrettify } from '@/lib/hooks';
import { Heading } from './heading';
import * as styles from './graphql-block.css';

/** A read-only, highlighted GraphQL document: SDL or an operation. */
export function GraphQLHighlight(props: { code: string; className?: string }): ReactElement {
  const pretty = usePrettify(props.code);

  return (
    <CodeScrollArea className={props.className}>
      <div className={styles.graphQLHighlightDiv}>
        <File
          file={{ name: 'document.graphql', contents: pretty ?? '' }}
          options={{ disableFileHeader: true }}
        />
      </div>
    </CodeScrollArea>
  );
}

export function GraphQLBlock({
  sdl,
  title,
  url,
  className,
}: {
  sdl: string;
  title?: string | ReactNode;
  url?: string;
  className?: string;
}): ReactElement {
  return (
    <div className={className}>
      <Card variants={{ onSurface: 'base' }}>
        <Heading className={styles.graphQLBlockHeading}>
          {title ?? 'SDL'}
          {url && <span className={styles.graphQLBlockSpan}>{url}</span>}
        </Heading>
        <div className={styles.graphQLBlockDiv}>
          <GraphQLHighlight code={sdl} />
        </div>
      </Card>
    </div>
  );
}
