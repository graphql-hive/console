import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'urql';
import { ProposalEditor, ServiceTab } from '@/components/target/proposals/editor';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { SaveIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import { cn } from '@/lib/utils';
import { Change } from '@graphql-inspector/core';

type Confirmation = { name: string; type: 'removal'; reason: string };

// @todo merge this into a parent query as a fragment to avoid issues w/cache
const Proposals_EditProposalQuery = graphql(`
  query Proposals_EditProposalQuery(
    $targetReference: TargetReferenceInput!
    $proposalInput: SchemaProposalInput!
  ) {
    me {
      id
      displayName
    }
    target(reference: $targetReference) {
      ...Proposals_SelectFragment
      ...Proposals_TargetProjectTypeFragment
      id
      slug
      project {
        id
        type
      }
      latestValidSchemaVersion {
        id
        schemas {
          edges {
            cursor
            node {
              __typename
              ... on CompositeSchema {
                id
                source
                service
                url
              }
              ... on SingleSchema {
                id
                source
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
    schemaProposal(input: $proposalInput) {
      id
      title
      author
      description
      rebasedSchemaSDL {
        edges {
          node {
            ... on CompositeSchema {
              id
              source
              service
              url
            }
            ... on SingleSchema {
              id
              source
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`);

export function TargetProposalEditPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
}) {
  // @todo show the error somewhere
  const [editorError, setEditorError] = useState('');

  const [query] = useQuery({
    query: Proposals_EditProposalQuery,
    variables: {
      targetReference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
      proposalInput: {
        id: props.proposalId,
      },
    },
  });
  const existingServices = useMemo(() => {
    return query.data?.target?.latestValidSchemaVersion?.schemas.edges.map(e => e.node);
  }, [query.data]);
  // @todo
  const [confirmations, setConfirmations] = useState<Array<Confirmation>>([]);
  const [changedServices, setChangedServices] = useState<Array<ServiceTab>>([]);
  useEffect(() => {
    setChangedServices(
      query.data?.schemaProposal?.rebasedSchemaSDL?.edges.map(({ node }) => {
        if (node.__typename === 'SingleSchema') {
          return node;
        }
        return {
          ...node,
          service: node.service ?? '',
          url: node.url ?? '',
        };
      }) ?? [],
    );
  }, [query.data?.schemaProposal?.rebasedSchemaSDL]);
  // @todo consider calculating from the supergraph?
  // const [serviceDiff, setServiceDiff] = useState<Array<{
  //   title: string;
  //   changes: Change[];
  //   error?: string;
  //   type: 'CompositeSchema' | 'SingleSchema';
  // }> | null>(null);

  return (
    <div className="min-h-[500px] w-full">
      <Button
        disabled={query.fetching}
        variant="outline"
        className="top 10 absolute right-12 justify-center px-3 font-bold"
      >
        <SaveIcon className="mr-1 size-4" /> Save Changes
      </Button>
      {query.fetching ? (
        <Spinner />
      ) : (
        <ProposalEditor
          {...props}
          changedServices={changedServices}
          setChangedServices={setChangedServices}
          existingServices={existingServices ?? []}
          projectTypeFragment={query.data?.target ?? undefined}
          selectFragment={query.data?.target ?? undefined}
          error={
            editorError.length > 0 && (
              <Callout type="error" className="mb-6 w-full text-sm">
                {editorError}
              </Callout>
            )
          }
        />
      )}
    </div>
  );
}
