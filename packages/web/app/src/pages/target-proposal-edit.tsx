import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { ProposalEditor, ServiceTab } from '@/components/target/proposals/editor';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { CheckIcon, SaveIcon, XIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import { useTimed } from '@/lib/hooks/use-timed';

// type Confirmation = { name: string; type: 'removal'; reason: string };

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

const UpdateProposedChangesMutation = graphql(`
  mutation Proposals_UpdateProposedChanges($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      ... on SchemaCheckSuccess {
        schemaCheck {
          id
        }
      }
      ... on SchemaCheckError {
        errors {
          edges {
            node {
              path
              message
            }
          }
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
  const [saved, startSavedTimer] = useTimed(1500);
  const [errored, startErroredTimer] = useTimed(1500);

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
  const [saveChangesResponse, saveChanges] = useMutation(UpdateProposedChangesMutation);
  const existingServices = useMemo(() => {
    return query.data?.target?.latestValidSchemaVersion?.schemas.edges.map(e => e.node);
  }, [query.data]);

  // @todo confirm deletions on save
  // const [confirmations, setConfirmations] = useState<Array<Confirmation>>([]);

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

  const onSaveChanges = async () => {
    const result = await Promise.all(
      changedServices.map(service => {
        return saveChanges({
          input: {
            target: {
              bySelector: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
              },
            },
            sdl: service.source,
            meta: query.data?.me.displayName
              ? {
                  author: query.data?.me.displayName,
                  commit: '', // @todo decide how to handle this commit ID
                }
              : null,
            schemaProposalId: props.proposalId,
            service:
              service.__typename === 'CompositeSchema' ? (service.service ?? service.id) : null,
            url: service.__typename === 'CompositeSchema' ? service.url : null,
          },
        });
      }),
    );
    const errors = changedServices
      .map((service, index) => {
        return { ...service, mutation: result[index] };
      })
      .filter(s => !!s.mutation.error);

    if (errors.length) {
      setEditorError(errors.map(e => `${e.id}: ${e.mutation.error?.message}`).join('\n'));
      startErroredTimer();
    } else {
      setEditorError('');
      startSavedTimer();
    }
  };

  return (
    <div className="relative min-h-[500px] w-full">
      <div className="absolute right-1 top-1 flex items-center">
        <Button
          disabled={query.fetching || saveChangesResponse.fetching}
          variant="outline"
          className="w-[160px] justify-center px-3 font-bold"
          onClick={onSaveChanges}
        >
          {saveChangesResponse.fetching ? (
            <Spinner className="mr-1 size-4" />
          ) : saved ? (
            <CheckIcon size={16} className="mr-1" />
          ) : errored ? (
            <XIcon className="mr-1 size-5 text-red-500" />
          ) : (
            <SaveIcon className="mr-1 size-4" />
          )}
          Save Changes
        </Button>
      </div>
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
