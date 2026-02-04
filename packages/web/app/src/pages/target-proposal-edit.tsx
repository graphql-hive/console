import { useContext, useEffect, useMemo, useState } from 'react';
import { ProposalEditor, ServiceTab } from '@/components/target/proposals/editor';
import {
  SaveProposalContext,
  SaveProposalModal,
} from '@/components/target/proposals/save-proposal-modal';
import { Button } from '@/components/ui/button';
import { SaveIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { FragmentType, graphql, useFragment } from '@/gql';

export const Proposals_EditProposalProposalFragment = graphql(`
  fragment Proposals_EditProposalProposalFragment on SchemaProposal {
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
`);

export const Proposals_EditProposalMeFragment = graphql(`
  fragment Proposals_EditProposalMeFragment on User {
    id
    displayName
  }
`);

export const Proposals_EditProposalTargetFragment = graphql(`
  fragment Proposals_EditProposalTargetFragment on Target {
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
`);

export function TargetProposalEditPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  proposal: FragmentType<typeof Proposals_EditProposalProposalFragment>;
  target: FragmentType<typeof Proposals_EditProposalTargetFragment>;
  me: FragmentType<typeof Proposals_EditProposalMeFragment> | null;
}) {
  const { isSaving, saveChanges } = useContext(SaveProposalContext);
  const me = useFragment(Proposals_EditProposalMeFragment, props.me);
  const schemaProposal = useFragment(Proposals_EditProposalProposalFragment, props.proposal);
  const target = useFragment(Proposals_EditProposalTargetFragment, props.target);
  const existingServices = useMemo(() => {
    return target?.latestValidSchemaVersion?.schemas.edges.map(e => e.node);
  }, [target]);

  // @todo confirm deletions on save
  // const [confirmations, setConfirmations] = useState<Array<Confirmation>>([]);

  const [changedServices, setChangedServices] = useState<Array<ServiceTab>>([]);
  useEffect(() => {
    setChangedServices(
      schemaProposal?.rebasedSchemaSDL?.edges.map(({ node }) => {
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
  }, [schemaProposal?.rebasedSchemaSDL]);

  return (
    <>
      <SaveProposalModal />
      <div className="relative min-h-[500px] w-full">
        <div className="absolute -top-0 right-1 flex items-center">
          <Button
            disabled={isSaving}
            variant="outline"
            className="w-[160px] justify-center px-3 font-bold"
            onClick={async () => {
              await saveChanges({
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                schemaProposalId: props.proposalId,
                author: me?.displayName ?? null,
                changes: changedServices,
              });
            }}
          >
            {isSaving ? (
              <Spinner className="mr-1 size-4" />
            ) : (
              // ) : saved ? (
              //   <CheckIcon size={16} className="mr-1 text-green-500" />
              // ) : errored ? (
              //   <XIcon className="mr-1 size-5 text-red-500" />
              <SaveIcon className="mr-1 size-4" />
            )}
            Save Changes
          </Button>
        </div>
        <ProposalEditor
          {...props}
          changedServices={changedServices}
          setChangedServices={setChangedServices}
          existingServices={existingServices ?? []}
          projectTypeFragment={target ?? undefined}
          selectFragment={target ?? undefined}
          error={
            <></>
            // @todo decide what to do with these errors...
            // editorError.length > 0 && (
            //   <Callout type="error" className="mb-6 w-full text-sm">
            //     {editorError}
            //   </Callout>
            // )
          }
        />
      </div>
    </>
  );
}
