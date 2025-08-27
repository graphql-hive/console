import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { TimeAgo } from '../v2';
import { Fragment, ReactElement, useContext } from 'react';
import { AnnotatedContext } from './schema-diff/components';
import { Title } from '../ui/page';
import { Callout } from '../ui/callout';
import { Button } from '../ui/button';

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
      <div className="rounded border-[1px] bg-black py-4 mb-2 font-sans px-6 border-gray-600">
        {review.comments?.edges?.map(({ node: comment }, idx) => {
          return <ReviewComment key={`comment-${comment.id}`} first={idx === 0} comment={comment} />;
        })}
      </div>
      {/* @todo check if able to reply */}
      <div className='mt-4 mb-6 gap-4 flex font-sans ml-1'>
        <Button variant='default' type='button' className='w-[120px] opacity-80'>Reply</Button>
        <Button variant='primary' type='button' className='w-[120px]'>Resolve</Button>
      </div>
    </>
  );
}

const ProposalOverview_CommentFragment = graphql(/** GraphQL */ `
  fragment ProposalOverview_CommentFragment on SchemaProposalComment {
    id
    user {
      id
      email
      displayName
      fullName
    }
    body
    updatedAt
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
        <div className="flex grow font-bold">
          {comment.user?.displayName ?? comment.user?.fullName ?? 'Unknown'}
        </div>
        <div className="flex text-xs">
          <TimeAgo date={comment.updatedAt} />
        </div>
      </div>
      <div className="flex-row">{comment.body}</div>
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
  return detachedReviewCoordinates.length ? (
    <Callout type='warning' className="mb-4 mt-0 items-start pt-4">
      <Title className='mb-3'>Detached Comments</Title>
      {detachedReviewCoordinates.map(c =>
        <Fragment key={c}>
          {props.annotate(c, true)}
        </Fragment>
      )}
    </Callout>
  ) : null;
}