import { Fragment } from 'react/jsx-runtime';
import { FragmentType } from '@/gql';
import { ProposalOverview_ReviewCommentsFragment, ReviewComments } from '../Review';
import { ChangeRow } from './components';
import { Word, WordProps } from './words';

type AnnotationProps = {
  lineText: string;
} & FragmentType<typeof ProposalOverview_ReviewCommentsFragment>;

export type LineProps = {
  indent: number;
  words: WordProps[];
  change: 'removal' | 'addition' | 'no change' | 'mutual';
  annotations?: AnnotationProps[];
};

// @todo annotations
export function Line(props: LineProps) {
  return (
    <ChangeRow
      indent={props.indent}
      type={props.change === 'no change' ? 'mutual' : props.change}
      coordinates={props.words.map(w => w.coordinate).filter(c => c !== undefined)}
    >
      {props.words.map((w, i) => (
        <Word {...w} key={`words-${i}`} />
      ))}
      {props.annotations?.map((node, i) => (
        <Fragment key={`annotations-${i}`}>
          {node.lineText && (
            <code className="mb-3 block w-full bg-gray-900 p-3 pl-6 text-white">
              {node.lineText}
            </code>
          )}
          <ReviewComments review={node} />
        </Fragment>
      ))}
    </ChangeRow>
  );
}
