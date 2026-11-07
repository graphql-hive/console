import { ReactElement, ReactNode } from 'react';
import { CodeScrollArea, File } from '@/components/ui/diffs';
import { Card } from '@/components/ui/primitives/card/card';
import { usePrettify } from '@/lib/hooks';
import { Heading } from './heading';
import { graphqlBlockStyles } from './graphql-block.css';

/** A read-only, highlighted GraphQL document: SDL or an operation. */
export function GraphQLHighlight(props: { code: string; className?: string }): ReactElement {
  const pretty = usePrettify(props.code);

  return (
    <CodeScrollArea className={props.className}>
      <div className={graphqlBlockStyles.highlight}>
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
        <Heading className={graphqlBlockStyles.heading}>
          {title ?? 'SDL'}
          {url && <span className={graphqlBlockStyles.url}>{url}</span>}
        </Heading>
        <div className={graphqlBlockStyles.body}>
          <GraphQLHighlight code={sdl} />
        </div>
      </Card>
    </div>
  );
}
