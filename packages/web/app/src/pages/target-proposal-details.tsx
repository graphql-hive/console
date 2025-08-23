import { Fragment } from 'react';
import { useQuery } from 'urql';
import {
  ChangesBlock,
  ChangesBlock_SchemaChangeFragment,
} from '@/components/target/history/errors-and-changes';
import { Spinner } from '@/components/ui/spinner';
import { graphql, useFragment } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';

const ProposalDetailsQuery = graphql(/* GraphQL */ `
  query ProposalDetailsQuery($id: ID!) {
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
              ...ChangesBlock_SchemaChangeFragment
            }
          }
        }
      }
    }
  }
`);

export function TargetProposalDetailsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  const [query] = useQuery({
    query: ProposalDetailsQuery,
    variables: {
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });

  return (
    <div className="w-full">
      {query.fetching && <Spinner />}
      {query.data?.schemaProposal?.versions?.edges?.map(edge => {
        const breakingChanges = edge.node.changes.filter((c): c is NonNullable<typeof c> => {
          const change = useFragment(ChangesBlock_SchemaChangeFragment, c);
          return !!c && change?.severityLevel === SeverityLevelType.Breaking;
        });
        const dangerousChanges = edge.node.changes.filter((c): c is NonNullable<typeof c> => {
          const change = useFragment(ChangesBlock_SchemaChangeFragment, c);
          return !!c && change?.severityLevel === SeverityLevelType.Dangerous;
        });
        const safeChanges = edge.node.changes.filter((c): c is NonNullable<typeof c> => {
          const change = useFragment(ChangesBlock_SchemaChangeFragment, c);
          return !!c && change?.severityLevel === SeverityLevelType.Safe;
        });
        return (
          <Fragment key={edge.node.id}>
            <ChangesBlock
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId=""
              title="Breaking Changes"
              severityLevel={SeverityLevelType.Breaking}
              changes={breakingChanges}
            />
            <ChangesBlock
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId=""
              title="Dangerous Changes"
              severityLevel={SeverityLevelType.Dangerous}
              changes={dangerousChanges}
            />
            <ChangesBlock
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId=""
              title="Safe Changes"
              severityLevel={SeverityLevelType.Safe}
              changes={safeChanges}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
