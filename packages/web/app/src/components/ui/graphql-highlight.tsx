import { ReactElement } from 'react';
import { CodeScrollArea, File } from '@/components/ui/diffs';
import { usePrettify } from '@/lib/hooks';

/** A read-only, highlighted GraphQL document: SDL or an operation. */
export function GraphQLHighlight(props: { code: string; className?: string }): ReactElement {
  const pretty = usePrettify(props.code);

  return (
    <CodeScrollArea className={props.className}>
      <div className="max-w-[inherit]">
        <File
          file={{ name: 'document.graphql', contents: pretty ?? '' }}
          options={{ disableFileHeader: true }}
        />
      </div>
    </CodeScrollArea>
  );
}
