import { useQuery } from 'urql';
import { Proposal } from '@/components/proposal';
import { Callout } from '@/components/ui/callout';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';

const ProposalSchemaQuery = graphql(/* GraphQL  */ `
  query ProposalSchemaQuery($reference: TargetReferenceInput!, $id: ID!) {
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

export function TargetProposalSchemaPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
}) {
  const [query] = useQuery({
    query: ProposalSchemaQuery,
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
  const proposalVersion = changesQuery.data?.schemaProposal?.versions?.edges?.[0];

  if (query.fetching || changesQuery.fetching) {
    return <Spinner />;
  }

  if (
    !query.stale &&
    !changesQuery.stale &&
    query.data?.__typename &&
    !query.data.latestValidVersion?.schemas
  ) {
    return <Callout type="warning">This target does not have a valid schema version.</Callout>;
  }

  if (proposalVersion) {
    return (
      <div className="w-full">
        {changesQuery?.data?.schemaProposal?.versions?.edges?.length === 0 && (
          <>No proposal versions</>
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
                reviews={proposal?.reviews ?? null}
                baseSchemaSDL={existingSchema}
                changes={proposed.changes.filter(c => !!c) ?? []}
                serviceName={proposed.serviceName ?? ''}
              />
            );
          }
        })}
      </div>
    );
  }
}
