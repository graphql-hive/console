import { useQuery } from 'urql';
import { stageToColor, userText } from '@/components/proposal/util';
import { Subtitle, Title } from '@/components/ui/page';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';
import { Link } from '@tanstack/react-router';
import { TargetProposalDetailsPage } from './target-proposal-details';
import { TargetProposalEditPage } from './target-proposal-edit';
import { TargetProposalSchemaPage } from './target-proposal-schema';
import { TargetProposalSupergraphPage } from './target-proposal-supergraph';

enum Page {
  SCHEMA = 'schema',
  SUPERGRAPH = 'supergraph',
  DETAILS = 'details',
  EDIT = 'edit',
}

const ProposalQuery = graphql(/* GraphQL  */ `
  query ProposalQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      createdAt
      updatedAt
      commentsCount
      stage
      title
      description
      versions(first: 30, after: null, input: { onlyLatest: true }) {
        edges {
          __typename
          node {
            id
            serviceName
            reviews {
              edges {
                cursor
                node {
                  id
                  comments {
                    __typename
                  }
                }
              }
            }
          }
        }
      }
      user {
        id
        email
        displayName
        fullName
      }
    }
  }
`);

export function TargetProposalLayoutPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  const [query] = useQuery({
    query: ProposalQuery,
    variables: {
      reference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });
  const proposal = query.data?.schemaProposal;
  return (
    <div className="ml-4 flex w-full grow flex-col rounded bg-gray-900/50 p-4">
      {query.fetching && <Spinner />}
      {proposal && (
        <>
          {/* @todo version dropdown Last updated <TimeAgo date={proposal.updatedAt} /> */}
          {/* @todo stage dropdown <Tag color={stageToColor(proposal.stage)}>{proposal.stage}</Tag> */}
          <div className="flex flex-row items-center gap-4">
            <Title>{proposal.title}</Title>
          </div>
          <div className="text-xs text-gray-400">
            proposed <TimeAgo date={proposal.createdAt} /> by {userText(proposal.user)}
          </div>
          <div className="w-full py-2">{proposal.description}</div>
        </>
      )}
      <MainContent {...props} />
    </div>
  );
}

function MainContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  return (
    <Tabs value={props.page}>
      <TabsList variant="menu" className="w-full">
        <TabsTrigger variant="menu" value={Page.SCHEMA} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'schema' }}
          >
            Schema
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Page.SUPERGRAPH} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'supergraph' }}
          >
            Supergraph Preview
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Page.DETAILS} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'details' }}
          >
            Details
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Page.EDIT} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'edit' }}
          >
            Edit
          </Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={Page.SCHEMA} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalSchemaPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Page.SUPERGRAPH} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalSupergraphPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Page.DETAILS} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalDetailsPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Page.EDIT} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalEditPage {...props} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export const ProposalPage = Page;
