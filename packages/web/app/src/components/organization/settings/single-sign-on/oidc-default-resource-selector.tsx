import { useCallback, useState } from 'react';
import { useMutation } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import { CheckIcon, XIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { DocumentType, FragmentType, graphql, useFragment } from '@/gql';
import { OidcIntegrationSection_OrganizationFragmentFragmentDoc } from '@/gql/graphql';
import {
  createResourceSelectionFromResourceAssignment,
  ResourceSelection,
  ResourceSelector,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
} from '../../members/resource-selector';

const OIDCDefaultResourceSelector_UpdateMutation = graphql(`
  mutation OIDCDefaultResourceSelector_UpdateMutation(
    $input: UpdateOIDCDefaultResourceAssignmentInput!
  ) {
    updateOIDCDefaultResourceAssignment(input: $input) {
      ok {
        updatedOIDCIntegration {
          id
          defaultResourceAssignment {
            ...OIDCDefaultResourceSelector_ResourceAssignmentFragment
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const OIDCDefaultResourceSelector_OrganizationFragment = graphql(`
  fragment OIDCDefaultResourceSelector_OrganizationFragment on Organization {
    id
    ...ResourceSelector_OrganizationFragment
  }
`);

const OIDCDefaultResourceSelector_ResourceAssignmentFragment = graphql(`
  fragment OIDCDefaultResourceSelector_ResourceAssignmentFragment on ResourceAssignment {
    ...createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment
  }
`);

export function OIDCDefaultResourceSelector(props: {
  disabled?: boolean;
  oidcIntegrationId: string;
  organization: FragmentType<typeof OIDCDefaultResourceSelector_OrganizationFragment>;
  resourceAssignment: FragmentType<typeof OIDCDefaultResourceSelector_ResourceAssignmentFragment>;
}) {
  const organization = useFragment(
    OIDCDefaultResourceSelector_OrganizationFragment,
    props.organization,
  );
  const resourceAssignment = useFragment(
    OIDCDefaultResourceSelector_ResourceAssignmentFragment,
    props.resourceAssignment,
  );
  const [_, mutate] = useMutation(OIDCDefaultResourceSelector_UpdateMutation);
  const [selection, setSelection] = useState<ResourceSelection>(() =>
    createResourceSelectionFromResourceAssignment(resourceAssignment),
  );

  const [mutateState, setMutateState] = useState<null | 'loading' | 'success' | 'error'>(null);
  const debouncedMutate = useDebouncedCallback(
    async (args: Parameters<typeof mutate>[0]) => {
      setMutateState('loading');
      await mutate(args)
        .then(data => {
          if (data.error) {
            setMutateState('error');
          } else {
            setMutateState('success');
          }
          return data;
        })
        .catch((err: unknown) => {
          console.error(err);
          setMutateState('error');
        });
    },
    1500,
    { leading: false },
  );

  function MutateState() {
    if (debouncedMutate.isPending() || mutateState === 'loading') {
      return <Spinner className="absolute right-0 top-0" />;
    }

    if (mutateState === 'error') {
      return <XIcon className="absolute right-0 top-0 text-red-500" />;
    }

    if (mutateState === 'success') {
      return <CheckIcon className="absolute right-0 top-0 text-emerald-500" />;
    }

    return null;
  }

  const _setSelection = useCallback(
    async (resources: ResourceSelection) => {
      setSelection(resources);
      await debouncedMutate({
        input: {
          oidcIntegrationId: props.oidcIntegrationId,
          resources: resourceSlectionToGraphQLSchemaResourceAssignmentInput(resources),
        },
      });
    },
    [debouncedMutate, setSelection, props.oidcIntegrationId],
  );

  return (
    <div className="relative">
      <MutateState />
      <ResourceSelector
        selection={selection}
        onSelectionChange={props.disabled ? () => void 0 : _setSelection}
        organization={organization}
      />
    </div>
  );
}
