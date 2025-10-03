import { useCallback } from 'react';
import { RefreshCcwIcon } from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { ProductUpdatesLink } from '@/components/ui/docs-note';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';

const LegacyCompositionSettings_OrganizationFragment = graphql(`
  fragment LegacyCompositionSettings_OrganizationFragment on Organization {
    id
    slug
  }
`);

const LegacyCompositionSettings_ProjectFragment = graphql(`
  fragment LegacyCompositionSettings_ProjectFragment on Project {
    id
    slug
  }
`);

const LegacyCompositionSettings_UpdateNativeCompositionMutation = graphql(`
  mutation LegacyCompositionSettings_UpdateNativeCompositionMutation(
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

const LegacyCompositionSettings_DisableExternalCompositionMutation = graphql(`
  mutation LegacyCompositionSettings_DisableExternalCompositionMutation(
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

export function LegacyCompositionSettings(props: {
  organization: FragmentType<typeof LegacyCompositionSettings_OrganizationFragment>;
  project: FragmentType<typeof LegacyCompositionSettings_ProjectFragment>;
  activeCompositionMode: 'native' | 'external' | 'legacy';
}) {
  const organization = useFragment(
    LegacyCompositionSettings_OrganizationFragment,
    props.organization,
  );
  const project = useFragment(LegacyCompositionSettings_ProjectFragment, props.project);

  const [updateNativeMutation, updateNative] = useMutation(
    LegacyCompositionSettings_UpdateNativeCompositionMutation,
  );
  const [disableExternalMutation, disableExternal] = useMutation(
    LegacyCompositionSettings_DisableExternalCompositionMutation,
  );
  const isMutationFetching = updateNativeMutation.fetching || disableExternalMutation.fetching;

  const { toast } = useToast();

  const enableLegacyComposition = useCallback(async () => {
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
          title: 'Failed to enable legacy composition',
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
            title: 'Failed to disable external composition while enabling legacy composition',
            description: disableExternalError,
          });
        }
      }

      toast({
        title: 'Successfully enabled legacy composition',
        description: `Your project is no longer using ${
          previousCompositionMode === 'external'
            ? 'external schema composition.'
            : 'our Open Source composition library for GraphQL Federation.'
        }`,
      });
    } catch (error) {
      console.log('Failed to enable legacy composition');
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to enable legacy composition',
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
          Not recommended. Migrate towards using Native Federation v2.
        </p>
        <ProductUpdatesLink href="2023-10-10-native-federation-2">
          Read the announcement!
        </ProductUpdatesLink>
      </div>

      <div className="flex flex-row items-center gap-x-2">
        <Button
          variant="destructive"
          onClick={() => enableLegacyComposition()}
          disabled={isMutationFetching || props.activeCompositionMode === 'legacy'}
        >
          {isMutationFetching ? (
            <>
              <RefreshCcwIcon className="mr-2 size-4 animate-spin" />
              Please wait
            </>
          ) : props.activeCompositionMode === 'legacy' ? (
            'Using Legacy Composition'
          ) : (
            'Use Legacy Composition'
          )}
        </Button>
      </div>
    </div>
  );
}
