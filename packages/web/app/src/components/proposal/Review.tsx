import { FragmentType, graphql, useFragment } from '@/gql';
import { TimeAgo } from '../v2';
import { cn } from '@/lib/utils';

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
  lineNumber: number;
}) {
  const review = useFragment(ProposalOverview_ReviewCommentsFragment, props.review);
  if (!review.comments) {
    return null;
  }

  return (
    <div className='p-2 bg-black border-[1px] rounded'>
      {review.comments?.edges?.map(({ node: comment }, idx) => {
        return (
          <ReviewComment first={idx===0} comment={comment}/>
        );
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
  first?: boolean
  comment: FragmentType<typeof ProposalOverview_CommentFragment>;
}) {
  const comment = useFragment(ProposalOverview_CommentFragment, props.comment);
  return (
    <>
      <div className={cn(!props.first && 'pl-4', 'flex flex-row grow align-middle')}>
        <div className='font-bold flex grow'>{comment.user?.displayName ?? comment.user?.fullName ?? 'Unknown'}</div>
        <div className='text-xs flex'><TimeAgo date={comment.updatedAt}/></div>
      </div>
      <div className='flex-row'>{comment.body}</div>
    </>
  )
}
