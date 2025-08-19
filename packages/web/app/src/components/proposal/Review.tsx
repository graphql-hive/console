import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { TimeAgo } from '../v2';

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
    <div className="rounded border-[1px] bg-black p-2">
      {review.comments?.edges?.map(({ node: comment }, idx) => {
        return <ReviewComment key={`comment-${comment.id}`} first={idx === 0} comment={comment} />;
      })}
    </div>
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
