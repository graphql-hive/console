import { useCallback } from 'react';
import { FlaskConicalIcon, HeartCrackIcon, PartyPopperIcon, RefreshCcwIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { NativeFederationCompatibilityStatusType } from '@/gql/graphql';
import { cn } from '@/lib/utils';

const IncrementalNativeCompositionSwitch_TargetFragment = graphql(`
  fragment IncrementalNativeCompositionSwitch_TargetFragment on Target {
    id
    slug
    experimental_forcedLegacySchemaComposition
  }
`);

const IncrementalNativeCompositionSwitch_Mutation = graphql(`
  mutation IncrementalNativeCompositionSwitch_Mutation(
    $input: Experimental__UpdateTargetSchemaCompositionInput!
  ) {
    experimental__updateTargetSchemaComposition(input: $input) {
      ...IncrementalNativeCompositionSwitch_TargetFragment
    }
  }
`);

const IncrementalNativeCompositionSwitch = (props: {
  organizationSlug: string;
  projectSlug: string;
  target: FragmentType<typeof IncrementalNativeCompositionSwitch_TargetFragment>;
}) => {
  const target = useFragment(IncrementalNativeCompositionSwitch_TargetFragment, props.target);
  const [mutation, mutate] = useMutation(IncrementalNativeCompositionSwitch_Mutation);

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-x-10 rounded border-[1px] border-gray-800 bg-gray-800/50 p-4',
        mutation.fetching && 'animate-pulse',
      )}
    >
      <div>
        <div className="text-sm font-semibold">{target.slug}</div>
        <div className="min-w-32 text-xs">
          {target.experimental_forcedLegacySchemaComposition ? 'Legacy' : 'Native'} composition
        </div>
      </div>
      <div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Switch
                disabled={mutation.fetching}
                onCheckedChange={nativeComposition => {
                  void mutate({
                    input: {
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: target.slug,
                      nativeComposition,
                    },
                  });
                }}
                checked={!target.experimental_forcedLegacySchemaComposition}
              />
            </TooltipTrigger>
            <TooltipContent sideOffset={2}>
              <span className="font-semibold">
                {target.experimental_forcedLegacySchemaComposition ? 'Enable' : 'Disable'}
              </span>{' '}
              native composition for the target
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const NativeCompositionSettings_OrganizationFragment = graphql(`
  fragment NativeCompositionSettings_OrganizationFragment on Organization {
    id
    slug
  }
`);

const NativeCompositionSettings_ProjectFragment = graphql(`
  fragment NativeCompositionSettings_ProjectFragment on Project {
    id
    slug
    experimental_nativeCompositionPerTarget
    targets {
      edges {
        node {
          id
          ...IncrementalNativeCompositionSwitch_TargetFragment
        }
      }
    }
  }
`);

const NativeCompositionSettings_ProjectQuery = graphql(`
  query NativeCompositionSettings_ProjectQuery($selector: ProjectSelectorInput!) {
    project(reference: { bySelector: $selector }) {
      id
      nativeFederationCompatibility {
        status
      }
      experimental_nativeCompositionPerTarget
    }
  }
`);

const NativeCompositionSettings_UpdateNativeCompositionMutation = graphql(`
  mutation NativeCompositionSettings_UpdateNativeCompositionMutation(
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

const NativeCompositionSettings_DisableExternalCompositionMutation = graphql(`
  mutation NativeCompositionSettings_DisableExternalCompositionMutation(
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

export function NativeCompositionSettings(props: {
  organization: FragmentType<typeof NativeCompositionSettings_OrganizationFragment>;
  project: FragmentType<typeof NativeCompositionSettings_ProjectFragment>;
  activeCompositionMode: 'native' | 'external' | 'apollo';
}) {
  const organization = useFragment(
    NativeCompositionSettings_OrganizationFragment,
    props.organization,
  );
  const project = useFragment(NativeCompositionSettings_ProjectFragment, props.project);
  const [projectQuery] = useQuery({
    query: NativeCompositionSettings_ProjectQuery,
    variables: {
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
      },
    },
  });

  const [updateNativeMutation, updateNative] = useMutation(
    NativeCompositionSettings_UpdateNativeCompositionMutation,
  );
  const [disableExternalMutation, disableExternal] = useMutation(
    NativeCompositionSettings_DisableExternalCompositionMutation,
  );
  const isMutationFetching = updateNativeMutation.fetching || disableExternalMutation.fetching;

  const { toast } = useToast();

  const enableNativeComposition = useCallback(async () => {
    const previousCompositionMode = props.activeCompositionMode;
    try {
      const updateNativeResult = await updateNative({
        input: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          enabled: true,
        },
      });

      const updateNativeError =
        updateNativeResult.error ?? updateNativeResult.data?.updateNativeFederation.error;
      if (updateNativeError) {
        return toast({
          variant: 'destructive',
          title: 'Failed to enable native composition',
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
            title: 'Failed to disable external composition while enabling native composition',
            description: disableExternalError,
          });
        }
      }

      toast({
        title: 'Successfully enabled native composition',
        description:
          'Your project is now using our Open Source composition library for Apollo Federation.',
      });
    } catch (error) {
      console.log('Failed to enable native composition');
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to enable native composition',
        description: String(error),
      });
    }
  }, [
    updateNative,
    disableExternal,
    toast,
    props.activeCompositionMode,
    organization.slug,
    project.slug,
  ]);

  return (
    <div className="flex flex-col items-start gap-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Recommended for most users. Use native Apollo Federation v2 composition for your project.
        </p>
      </div>

      {props.activeCompositionMode === 'native' &&
      project.experimental_nativeCompositionPerTarget === true ? (
        <div className="space-y-4">
          <div>
            <div className="flex flex-row items-center gap-x-2">
              <div className="font-semibold">Incremental migration</div>
              <Badge variant="outline">experimental</Badge>
            </div>
            <div className="text-muted-foreground text-sm">
              Your project is using the experimental incremental migration feature. <br />
              Migrate targets one by one to the native schema composition.
            </div>
          </div>
          <div>
            <div className="flex flex-row gap-4">
              {project.targets.edges.map(edge => (
                <IncrementalNativeCompositionSwitch
                  organizationSlug={organization.slug}
                  projectSlug={project.slug}
                  key={edge.node.id}
                  target={edge.node}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {projectQuery.fetching ? (
        <Spinner />
      ) : projectQuery.error ? (
        <div className="flex flex-row items-center gap-x-4">
          <div>
            <HeartCrackIcon className="size-10 text-red-500" />
          </div>
          <div>
            <div className="text-base font-semibold">
              Failed to check compatibility. Please try again later.
            </div>
          </div>
        </div>
      ) : projectQuery.data?.project ? (
        <div className="flex flex-row items-center gap-x-4">
          <div>
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Compatible ? (
              <PartyPopperIcon className="size-10 text-emerald-500" />
            ) : null}
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Incompatible ? (
              <HeartCrackIcon className="size-10 text-red-500" />
            ) : null}
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Unknown ? (
              <FlaskConicalIcon className="size-10 text-orange-500" />
            ) : null}
          </div>
          <div>
            <div className="text-base font-semibold">
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Compatible
                ? 'Your project is compatible'
                : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Incompatible
                ? 'Your project is not yet supported'
                : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Unknown
                ? 'Unclear whether your project is compatible'
                : null}
            </div>
            <div className="text-muted-foreground text-sm">
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Compatible ? (
                <>
                  Subgraphs of this project are composed and validated correctly by our{' '}
                  <a
                    className="text-muted-foreground font-semibold underline-offset-4 hover:underline"
                    href="https://github.com/the-guild-org/federation"
                  >
                    Open Source composition library
                  </a>{' '}
                  for Apollo Federation.
                </>
              ) : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Incompatible ? (
                <>
                  Our{' '}
                  <a
                    className="text-muted-foreground font-semibold underline-offset-4 hover:underline"
                    href="https://github.com/the-guild-org/federation"
                  >
                    Open Source composition library
                  </a>{' '}
                  is not yet compatible with subgraphs of your project. We're working on it!
                  <br />
                  Please reach out to us to explore solutions for addressing this issue and share
                  this report with us:
                  <a
                    href={`/native-composition-compatibility-report/${projectQuery.data.project.id}`}
                  >
                    View full report
                  </a>
                </>
              ) : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Unknown ? (
                <>
                  Your project appears to lack any subgraphs at the moment, making it impossible for
                  us to assess compatibility with our{' '}
                  <a
                    className="text-muted-foreground font-semibold underline-offset-4 hover:underline"
                    href="https://github.com/the-guild-org/federation"
                  >
                    Open Source composition library
                  </a>
                  .
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-row items-center gap-x-2">
        <Button
          onClick={() => enableNativeComposition()}
          disabled={isMutationFetching || props.activeCompositionMode === 'native'}
        >
          {isMutationFetching ? (
            <>
              <RefreshCcwIcon className="mr-2 size-4 animate-spin" />
              Please wait
            </>
          ) : props.activeCompositionMode === 'native' ? (
            'Using Native Composition'
          ) : (
            'Use Native Composition'
          )}
        </Button>
        <div>
          <Button variant="link" className="text-orange-500" asChild>
            <a href="https://github.com/the-guild-org/federation?tab=readme-ov-file#compatibility">
              Learn more about risks and compatibility with Apollo Composition
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
