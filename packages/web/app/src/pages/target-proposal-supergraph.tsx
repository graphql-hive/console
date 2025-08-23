import { buildSchema } from 'graphql';
import { useQuery } from 'urql';
import { ProposalOverview_ChangeFragment, toUpperSnakeCase } from '@/components/proposal';
import { SchemaDiff } from '@/components/proposal/schema-diff/schema-diff';
import { Spinner } from '@/components/ui/spinner';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Change } from '@graphql-inspector/core';
import { patchSchema } from '@graphql-inspector/patch';

// @todo compose the changes subgraphs instead of modifying the supergraph...
const ProposalSupergraphChangesQuery = graphql(/* GraphQL  */ `
  query ProposalSupergraphChangesQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      versions(after: null, input: { onlyLatest: true }) {
        edges {
          node {
            id
            serviceName
            changes {
              ...ProposalOverview_ChangeFragment
            }
          }
        }
      }
    }
  }
`);

const ProposalSupergraphLatestQuery = graphql(/* GraphQL */ `
  query ProposalSupergraphLatestQuery($reference: TargetReferenceInput!) {
    latestValidVersion(target: $reference) {
      id
      supergraph
    }
  }
`);

export function TargetProposalSupergraphPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  const [query] = useQuery({
    query: ProposalSupergraphChangesQuery,
    variables: {
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });
  const [latestQuery] = useQuery({
    query: ProposalSupergraphLatestQuery,
    variables: {
      reference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
    },
  });

  // @todo use pagination to collect all
  const allChanges: (FragmentType<typeof ProposalOverview_ChangeFragment> | null | undefined)[] =
    [];
  query?.data?.schemaProposal?.versions?.edges?.map(({ node: { changes } }) => {
    allChanges.push(...changes);
  });

  return (
    <div className="w-full">
      {query.fetching || (query.fetching && <Spinner />)}
      <SupergraphDiff
        baseSchemaSDL={latestQuery.data?.latestValidVersion?.supergraph ?? ''}
        changes={allChanges}
      />
    </div>
  );
}

function SupergraphDiff(props: {
  baseSchemaSDL: string;
  changes: (FragmentType<typeof ProposalOverview_ChangeFragment> | null | undefined)[] | null;
}) {
  if (props.baseSchemaSDL.length === 0) {
    return null;
  }
  try {
    const before = buildSchema(props.baseSchemaSDL, { assumeValid: true, assumeValidSDL: true });
    const changes =
      props.changes
        ?.map((change): Change<any> | null => {
          const c = useFragment(ProposalOverview_ChangeFragment, change);
          if (c) {
            return {
              criticality: {
                // isSafeBasedOnUsage: ,
                // reason: ,
                level: c.severityLevel as any,
              },
              message: c.message,
              meta: c.meta,
              type: (c.meta && toUpperSnakeCase(c.meta?.__typename)) ?? '', // convert to upper snake
              path: c.path?.join('.'),
            };
          }
          return null;
        })
        .filter(c => !!c) ?? [];
    const after = patchSchema(before, changes, { throwOnError: false });
    return <SchemaDiff before={before} after={after} annotations={() => null} />;
  } catch (e: unknown) {
    return (
      <>
        <div className="text-lg">Invalid SDL</div>
        <div>{e instanceof Error ? e.message : String(e)}</div>
      </>
    );
  }
}
