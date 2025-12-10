import { Fragment, ReactElement, useContext } from 'react';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/button';
import { CheckIcon, PlusIcon } from '../../ui/icon';
import { TimeAgo } from '../../v2';
import { AnnotatedContext } from './schema-diff/components';

const ProposalOverview_ReviewCommentsFragment = graphql(/** GraphQL */ `
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
      <div className="mb-2 rounded border-[1px] border-gray-600 bg-black px-6 py-4 font-sans">
        {review.comments?.edges?.map(({ node: comment }, idx) => {
          return (
            <ReviewComment key={`comment-${comment.id}`} first={idx === 0} comment={comment} />
          );
        })}
      </div>
      {/* @todo check if able to reply */}
      <div className="mb-6 ml-6 mt-3 flex gap-4 font-sans">
        <Button variant="outline" type="button" className="px-4">
          <PlusIcon size={16} className="mr-1" />
          Reply
        </Button>
        <Button variant="outline" type="button" className="px-4">
          <CheckIcon size={16} className="mr-1" />
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
      <div className={cn(!props.first && 'pl-4', 'flex grow flex-row align-middle')}>
        <div className="flex grow font-bold text-gray-400">{comment.author ?? 'Unknown'}</div>
        <div className="flex text-xs">
          {!!comment.updatedAt && 'updated '}
          <TimeAgo date={comment.updatedAt ?? comment.createdAt} className="text-gray-400" />
        </div>
      </div>
      <div className="mt-2 flex-row">{comment.body}</div>
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
