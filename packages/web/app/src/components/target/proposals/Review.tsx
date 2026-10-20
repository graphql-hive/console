import { Fragment, ReactElement, useContext } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { AnnotatedContext } from './schema-diff/components';
import * as styles from './Review.css';

export const ProposalOverview_ReviewCommentsFragment = graphql(/** GraphQL */ `
  fragment ProposalOverview_ReviewCommentsFragment on SchemaProposalReview {
    id
    comments {
      edges {
        cursor
        node {
          id
          ...ProposalOverview_CommentFragment
        }
      }
      pageInfo {
        startCursor
      }
    }
  }
`);

export function ReviewComments(props: {
  review: FragmentType<typeof ProposalOverview_ReviewCommentsFragment>;
}) {
  const review = useFragment(ProposalOverview_ReviewCommentsFragment, props.review);
  if (!review.comments) {
    return null;
  }

  return (
    <>
      <div className={styles.reviewCommentsDiv}>
        {review.comments?.edges?.map(({ node: comment }, idx) => {
          return (
            <ReviewComment key={`comment-${comment.id}`} first={idx === 0} comment={comment} />
          );
        })}
      </div>
      {/* @todo check if able to reply */}
      <div className={styles.reviewCommentsDiv2}>
        <Button variant="outline" type="button">
          <PlusIcon size={16} className={styles.reviewCommentsPlusIcon} />
          Reply
        </Button>
        <Button variant="outline" type="button">
          <CheckIcon size={16} className={styles.reviewCommentsCheckIcon} />
          Resolve
        </Button>
      </div>
    </>
  );
}

const ProposalOverview_CommentFragment = graphql(/** GraphQL */ `
  fragment ProposalOverview_CommentFragment on SchemaProposalComment {
    id
    author
    body
    updatedAt
    createdAt
  }
`);

export function ReviewComment(props: {
  first?: boolean;
  comment: FragmentType<typeof ProposalOverview_CommentFragment>;
}) {
  const comment = useFragment(ProposalOverview_CommentFragment, props.comment);
  return (
    <>
      <div className={cn(!props.first && styles.reviewCommentDiv, styles.reviewCommentDiv2)}>
        <div className={styles.reviewCommentDiv3}>{comment.author ?? 'Unknown'}</div>
        <div className={styles.reviewCommentDiv4}>
          {!!comment.updatedAt && 'updated '}
          <TimeAgo
            date={comment.updatedAt ?? comment.createdAt}
            className={styles.reviewCommentTimeAgo}
          />
        </div>
      </div>
      <div className={styles.reviewCommentDiv5}>{comment.body}</div>
    </>
  );
}

export function DetachedAnnotations(props: {
  /** All of the coordinates that have annotations */
  coordinates: string[];
  annotate: (coordinate: string, withPreview?: boolean) => ReactElement | null;
}) {
  /** Get the list of coordinates that have already been annotated */
  const { annotatedCoordinates } = useContext(AnnotatedContext);
  const detachedReviewCoordinates = props.coordinates.filter(c => annotatedCoordinates?.has(c));
  return detachedReviewCoordinates.length
    ? detachedReviewCoordinates.map(c => <Fragment key={c}>{props.annotate(c, true)}</Fragment>)
    : null;
}
