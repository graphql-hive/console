import { Fragment, ReactElement, useContext } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AnnotatedContext } from './schema-diff/components';
import { reviewStyles } from './Review.css';

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
      <div className={reviewStyles.comments}>
        {review.comments?.edges?.map(({ node: comment }, idx) => {
          return (
            <ReviewComment key={`comment-${comment.id}`} first={idx === 0} comment={comment} />
          );
        })}
      </div>
      {/* @todo check if able to reply */}
      <div className={reviewStyles.actions}>
        <Button variant="outline" type="button">
          <PlusIcon size={16} className={reviewStyles.actionIcon} />
          Reply
        </Button>
        <Button variant="outline" type="button">
          <CheckIcon size={16} className={reviewStyles.actionIcon} />
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
      <div className={reviewStyles.commentHeader({ reply: !props.first })}>
        <div className={reviewStyles.commentAuthor}>{comment.author ?? 'Unknown'}</div>
        <div className={reviewStyles.commentMeta}>
          {!!comment.updatedAt && 'updated '}
          <TimeAgo
            date={comment.updatedAt ?? comment.createdAt}
            className={reviewStyles.commentTime}
          />
        </div>
      </div>
      <div className={reviewStyles.commentBody}>{comment.body}</div>
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
