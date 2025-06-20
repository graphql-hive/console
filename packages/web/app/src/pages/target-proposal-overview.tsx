import { useQuery } from 'urql';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import { Tag, TimeAgo } from '@/components/v2';
import { stageToColor, userText } from '@/components/proposal/util';
import { Subtitle, Title } from '@/components/ui/page';
import { ProposalSDL } from '@/components/proposal/proposal-sdl';

const ProposalOverviewQuery = graphql(/** GraphQL  */ `
  query ProposalOverviewQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      createdAt
      updatedAt
      commentsCount
      stage
      title
      versions(input: { onlyLatest: true }) {
        edges {
          node {
            id
            schemaSDL
            serviceName
          }
        }
      }
      user {
        id
        email
        displayName
        fullName
      }
      reviews {
        ...ProposalOverview_ReviewsFragment
      }
    }
  }
`);

export function TargetProposalOverviewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  const [query] = useQuery({
    query: ProposalOverviewQuery,
    variables: {
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });

  const proposal = query.data?.schemaProposal;

  return (
    <div>
      {query.fetching && <Spinner />}
      {proposal && (
        <>
          <Subtitle>{userText(proposal.user)} proposed <TimeAgo date={proposal.createdAt}/> </Subtitle>
          <div className='flex flex-row items-center gap-4'>
            <Title>{proposal.title}</Title>
            <Tag color={stageToColor(proposal.stage)}>{proposal.stage}</Tag>
          </div>
          <div className='text-xs'>Last updated <TimeAgo date={proposal.updatedAt}/></div>
          <ProposalSDL reviews={proposal.reviews} sdl=""/>
        </>
      )}
    </div>
  );
}
