import { useQuery } from 'urql';
import { Proposal } from '@/components/proposal';
import { stageToColor, userText } from '@/components/proposal/util';
import { Callout } from '@/components/ui/callout';
import { Subtitle, Title } from '@/components/ui/page';
import { Spinner } from '@/components/ui/spinner';
import { Tag, TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';
import { Change } from '@graphql-inspector/core';

const ProposalOverviewQuery = graphql(/* GraphQL  */ `
  query ProposalOverviewQuery($reference: TargetReferenceInput!, $id: ID!) {
    latestValidVersion(target: $reference) {
      id
      # sdl
      schemas {
        edges {
          node {
            ... on CompositeSchema {
              id
              source
              service
            }
            ... on SingleSchema {
              id
              source
            }
          }
        }
      }
    }
    schemaProposal(input: { id: $id }) {
      id
      createdAt
      updatedAt
      commentsCount
      stage
      title
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
      reviews {
        ...ProposalOverview_ReviewsFragment
      }
    }
  }
`);

const ProposalChangesQuery = graphql(/* GraphQL */ `
  query ProposalChangesQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      versions(after: null, input: { onlyLatest: true }) {
        edges {
          __typename
          node {
            id
            serviceName
            changes {
              __typename
              ...ProposalOverview_ChangeFragment
            }
          }
        }
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
  const [changesQuery] = useQuery({
    query: ProposalChangesQuery,
    variables: {
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });

  const proposal = query.data?.schemaProposal;
  const proposalVersion = proposal?.versions?.edges?.[0];

  return (
    <div className="w-full">
      {query.fetching && <Spinner />}
      {proposalVersion && (
        <>
          <Subtitle>
            {userText(proposal.user)} proposed <TimeAgo date={proposal.createdAt} />{' '}
          </Subtitle>
          <div className="flex flex-row items-center gap-4">
            <Title>{proposal.title}</Title>
            <Tag color={stageToColor(proposal.stage)}>{proposal.stage}</Tag>
          </div>
          <div className="text-xs">
            Last updated <TimeAgo date={proposal.updatedAt} />
          </div>
          {!query.data?.latestValidVersion && (
            <Callout type="warning">This target does not have a valid schema version.</Callout>
          )}
          {changesQuery.fetching ? (
            <Spinner />
          ) : (
            changesQuery?.data?.schemaProposal?.versions?.edges?.length === 0 && (
              <>No proposal versions</>
            )
          )}
          {changesQuery?.data?.schemaProposal?.versions?.edges?.map(({ node: proposed }) => {
            const existingSchema = query.data?.latestValidVersion?.schemas.edges.find(
              ({ node }) =>
                (node.__typename === 'CompositeSchema' && node.service === proposed.serviceName) ||
                (node.__typename === 'SingleSchema' && proposed.serviceName == null),
            )?.node.source;
            if (existingSchema) {
              return (
                <Proposal
                  key={`${proposed.id}-${proposed.serviceName ?? ''}`}
                  latestProposalVersionId={proposalVersion.node.id}
                  reviews={proposal.reviews ?? null}
                  baseSchemaSDL={existingSchema}
                  changes={proposed.changes ?? []}
                  serviceName={proposed.serviceName ?? ''}
                />
              );
            }

            return (
              <div key={`${proposed.id}-${proposed.serviceName ?? ''}`}>
                {`Proposed changes cannot be applied to the ${proposed.serviceName ? `"${proposed.serviceName}" ` : ''}schema because it does not exist.`}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
