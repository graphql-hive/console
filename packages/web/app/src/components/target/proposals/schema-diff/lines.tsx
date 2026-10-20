import { ReactElement, useCallback, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { Button } from '@/components/ui/primitives/button/button';
import { FragmentType } from '@/gql';
import { ProposalOverview_ReviewCommentsFragment, ReviewComments } from '../Review';
import { ChangeRow } from './components';
import { Word, WordProps } from './words';
import * as styles from './lines.css';

type AnnotationProps = {
  lineText: string;
} & FragmentType<typeof ProposalOverview_ReviewCommentsFragment>;

export type LineProps = {
  indent: number;
  words: WordProps[];
  change: 'removal' | 'addition' | 'no change' | 'mutual';
  annotations?: AnnotationProps[];
};

export function LineGroup(props: { children?: ReactElement[]; collapsible?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(
    props.collapsible && (props.children?.length ?? 0) > 10,
  );
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, []);

  if (isCollapsed) {
    return (
      <tbody>
        {props.children?.slice(0, 3)}
        <tr>
          <td colSpan={3} className={styles.lineGroupTd}>
            ...
          </td>
        </tr>
        <tr>
          <td colSpan={3}>
            <Button variant="link" onClick={toggleCollapsed}>
              + show more
            </Button>
          </td>
        </tr>
        <tr>
          <td colSpan={3} className={styles.lineGroupTd2}>
            ...
          </td>
        </tr>
        {props.children?.slice(-3, props.children.length)}
      </tbody>
    );
  }
  return <tbody>{props.children}</tbody>;
}

export function Line(props: LineProps & { beforeLine: number; afterLine: number }) {
  return (
    <ChangeRow
      indent={props.indent}
      type={props.change === 'no change' ? 'mutual' : props.change}
      coordinates={props.words.map(w => w.coordinate).filter(c => c !== undefined)}
      beforeLine={props.beforeLine}
      afterLine={props.afterLine}
    >
      {props.words.map((w, i) => (
        <Word {...w} key={`words-${i}`} />
      ))}
      {props.annotations?.map((node, i) => (
        <Fragment key={`annotations-${i}`}>
          {node.lineText && <code className={styles.lineCode}>{node.lineText}</code>}
          <ReviewComments review={node} />
        </Fragment>
      ))}
    </ChangeRow>
  );
}
