import { useCallback } from 'react';
import { RefreshCcwIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { ProductUpdatesLink } from '@/components/ui/docs-note';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';

const ApolloCompositionSettings_OrganizationFragment = graphql(`
  fragment ApolloCompositionSettings_OrganizationFragment on Organization {
    id
    slug
  }
`);

const ApolloCompositionSettings_ProjectFragment = graphql(`
  fragment ApolloCompositionSettings_ProjectFragment on Project {
    id
    slug
  }
`);

const ApolloCompositionSettings_UpdateNativeCompositionMutation = graphql(`
  mutation ApolloCompositionSettings_UpdateNativeCompositionMutation(
    $input: UpdateNativeFederationInput!
  ) {
    updateNativeFederation(input: $input) {
      ok {
        ...CompositionSettings_ProjectFragment
      }
      error {
        message
      }
    }
  }
`);

const ApolloCompositionSettings_DisableExternalCompositionMutation = graphql(`
  mutation ApolloCompositionSettings_DisableExternalCompositionMutation(
    $input: DisableExternalSchemaCompositionInput!
  ) {
    disableExternalSchemaComposition(input: $input) {
      ok {
        ...CompositionSettings_ProjectFragment
      }
      error
    }
  }
`);

export function ApolloCompositionSettings(props: {
  organization: FragmentType<typeof ApolloCompositionSettings_OrganizationFragment>;
  project: FragmentType<typeof ApolloCompositionSettings_ProjectFragment>;
  activeCompositionMode: 'native' | 'external' | 'apollo';
}) {
  const organization = useFragment(
    ApolloCompositionSettings_OrganizationFragment,
    props.organization,
  );
  const project = useFragment(ApolloCompositionSettings_ProjectFragment, props.project);

  const [updateNativeMutation, updateNative] = useMutation(
    ApolloCompositionSettings_UpdateNativeCompositionMutation,
  );
  const [disableExternalMutation, disableExternal] = useMutation(
    ApolloCompositionSettings_DisableExternalCompositionMutation,
  );
  const isMutationFetching = updateNativeMutation.fetching || disableExternalMutation.fetching;

  const { toast } = useToast();

  const enableApolloComposition = useCallback(async () => {
    const previousCompositionMode = props.activeCompositionMode;
    try {
      const updateNativeResult = await updateNative({
        input: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          enabled: false,
        },
      });

      const updateNativeError =
        updateNativeResult.error ?? updateNativeResult.data?.updateNativeFederation.error;
      if (updateNativeError) {
        return toast({
          variant: 'destructive',
          title: 'Failed to enable Apollo Composition',
          description: updateNativeError.message,
        });
      }

      if (previousCompositionMode === 'external') {
        const disableExternalResult = await disableExternal({
          input: {
            organizationSlug: organization.slug,
            projectSlug: project.slug,
          },
        });
        const disableExternalError =
          disableExternalResult.error?.message ??
          disableExternalResult.data?.disableExternalSchemaComposition.error;
        if (disableExternalError != null) {
          return toast({
            variant: 'destructive',
            title: 'Failed to disable external composition while enabling Apollo Composition',
            description: disableExternalError,
          });
        }
      }

      toast({
        title: 'Successfully enabled Apollo Composition (Legacy)',
        description: `Your project is no longer using ${
          previousCompositionMode === 'external'
            ? 'external schema composition.'
            : 'our Open Source composition library for Apollo Federation.'
        }`,
      });
    } catch (error) {
      console.log('Failed to enable Apollo Composition');
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to enable Apollo Composition',
        description: String(error),
      });
    }
  }, [
    updateNative,
    disableExternal,
    toast,
    organization.slug,
    project.slug,
    props.activeCompositionMode,
  ]);

  return (
    <div className="flex flex-col items-start gap-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Legacy. Recommended to migrate towards using native composition.
        </p>
        <ProductUpdatesLink href="2023-10-10-native-federation-2">
          Read the announcement!
        </ProductUpdatesLink>
      </div>

      <div className="flex flex-row items-center gap-x-2">
        <Button
          variant="destructive"
          onClick={() => enableApolloComposition()}
          disabled={isMutationFetching || props.activeCompositionMode === 'apollo'}
        >
          {isMutationFetching ? (
            <>
              <RefreshCcwIcon className="mr-2 size-4 animate-spin" />
              Please wait
            </>
          ) : props.activeCompositionMode === 'apollo' ? (
            'Using Apollo Composition (Legacy)'
          ) : (
            'Use Apollo Composition (Legacy)'
          )}
        </Button>
      </div>
    </div>
  );
}
