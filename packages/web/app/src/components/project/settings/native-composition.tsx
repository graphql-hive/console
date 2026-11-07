import { useCallback, useState } from 'react';
import { FlaskConicalIcon, HeartCrackIcon, PartyPopperIcon, RefreshCcwIcon } from 'lucide-react';
import { CombinedError, useMutation, useQuery } from 'urql';
import { Link } from '@/components/ui/link';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Button } from '@/components/ui/primitives/button/button';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { Switch } from '@/components/ui/primitives/switch/switch';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import {
  NativeFederationCompatibilityStatusType,
  UpdateSchemaCompositionInput,
} from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import * as shared from '@/styles/shared.css';
import { nativeCompositionStyles } from './native-composition.css';

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
  target: FragmentType<typeof IncrementalNativeCompositionSwitch_TargetFragment>;
}) => {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const target = useFragment(IncrementalNativeCompositionSwitch_TargetFragment, props.target);
  const [mutation, mutate] = useMutation(IncrementalNativeCompositionSwitch_Mutation);

  return (
    <div className={nativeCompositionStyles.target({ pending: mutation.fetching })}>
      <div>
        <div className={nativeCompositionStyles.targetName}>{target.slug}</div>
        <div className={nativeCompositionStyles.targetMode}>
          {target.experimental_forcedLegacySchemaComposition ? 'Legacy' : 'Native'} composition
        </div>
      </div>
      <div>
        <Tooltip
          trigger={
            <span className={shared.inlineFlex}>
              <Switch
                disabled={mutation.fetching}
                onCheckedChange={nativeComposition => {
                  void mutate({
                    input: {
                      organizationSlug,
                      projectSlug,
                      targetSlug: target.slug,
                      nativeComposition,
                    },
                  });
                }}
                checked={!target.experimental_forcedLegacySchemaComposition}
              />
            </span>
          }
          sideOffset={2}
          content={
            <>
              <span className={shared.weight.semibold}>
                {target.experimental_forcedLegacySchemaComposition ? 'Enable' : 'Disable'}
              </span>{' '}
              native composition for the target
            </>
          }
        />
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

const NativeCompositionSettings_UpdateResultFragment = graphql(`
  fragment NativeCompositionSettings_UpdateResultFragment on UpdateSchemaCompositionResult {
    ok {
      __typename
    }
    error {
      message
    }
  }
`);

export function NativeCompositionSettings(props: {
  organization: FragmentType<typeof NativeCompositionSettings_OrganizationFragment>;
  project: FragmentType<typeof NativeCompositionSettings_ProjectFragment>;
  activeCompositionMode: 'native' | 'external' | 'legacy';
  onMutate: (
    input: UpdateSchemaCompositionInput,
  ) => Promise<FragmentType<typeof NativeCompositionSettings_UpdateResultFragment> | CombinedError>;
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

  const { toast } = useToast();

  const [isMutating, setIsMutating] = useState(false);
  const enableNativeComposition = useCallback(async () => {
    setIsMutating(true);
    try {
      const result = await props.onMutate({
        project: {
          bySelector: {
            projectSlug: project.slug,
            organizationSlug: organization.slug,
          },
        },
        method: {
          native: true,
        },
      });

      if (result instanceof CombinedError) {
        toast({
          variant: 'destructive',
          title: 'Failed to enable native composition',
          description: result.message,
        });
      } else {
        // actually not a hook
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const updateResult = useFragment(NativeCompositionSettings_UpdateResultFragment, result);
        if (updateResult.ok) {
          toast({
            title: 'Successfully enabled native composition',
            description:
              'Your project is now using our Open Source composition library for GraphQL Federation.',
          });
        } else if (updateResult.error) {
          toast({
            variant: 'destructive',
            title: 'Failed to enable native composition',
            description: updateResult.error.message,
          });
        }
      }
    } catch (error) {
      console.log('Failed to enable native composition');
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to enable native composition',
        description: String(error),
      });
    } finally {
      setIsMutating(false);
    }
  }, [toast, props.onMutate, organization.slug, project.slug]);

  return (
    <div className={nativeCompositionStyles.root}>
      <div>
        <p className={nativeCompositionStyles.description}>
          Recommended for most users. Use native GraphQL Federation v2 composition for your project.
        </p>
      </div>

      {props.activeCompositionMode === 'native' &&
      project.experimental_nativeCompositionPerTarget === true ? (
        <div className={nativeCompositionStyles.migration}>
          <div>
            <div className={nativeCompositionStyles.migrationTitle}>
              <div className={shared.weight.semibold}>Incremental migration</div>
              <Badge content="experimental" variants={{ variant: 'outline' }} />
            </div>
            <div className={nativeCompositionStyles.compatibilityText}>
              Your project is using the experimental incremental migration feature. <br />
              Migrate targets one by one to the native schema composition.
            </div>
          </div>
          <div>
            <div className={nativeCompositionStyles.targets}>
              {project.targets.edges.map(edge => (
                <IncrementalNativeCompositionSwitch key={edge.node.id} target={edge.node} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {projectQuery.fetching ? (
        <Spinner />
      ) : projectQuery.error ? (
        <div className={nativeCompositionStyles.compatibility}>
          <div>
            <HeartCrackIcon className={nativeCompositionStyles.compatibilityIncompatible} />
          </div>
          <div>
            <div className={nativeCompositionStyles.compatibilityTitle}>
              Failed to check compatibility. Please try again later.
            </div>
          </div>
        </div>
      ) : projectQuery.data?.project ? (
        <div className={nativeCompositionStyles.compatibility}>
          <div>
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Compatible ? (
              <PartyPopperIcon className={nativeCompositionStyles.compatibilityCompatible} />
            ) : null}
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Incompatible ? (
              <HeartCrackIcon className={nativeCompositionStyles.compatibilityIncompatible} />
            ) : null}
            {projectQuery.data.project.nativeFederationCompatibility.status ===
            NativeFederationCompatibilityStatusType.Unknown ? (
              <FlaskConicalIcon className={nativeCompositionStyles.compatibilityUnknown} />
            ) : null}
          </div>
          <div>
            <div className={nativeCompositionStyles.compatibilityTitle}>
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
            <div className={nativeCompositionStyles.compatibilityText}>
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Compatible ? (
                <>
                  Subgraphs of this project are composed and validated correctly by our{' '}
                  <a
                    className={nativeCompositionStyles.link}
                    href="https://github.com/the-guild-org/federation"
                  >
                    Open Source composition library
                  </a>{' '}
                  for GraphQL Federation.
                </>
              ) : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Incompatible ? (
                <>
                  Our{' '}
                  <a
                    className={nativeCompositionStyles.link}
                    href="https://github.com/the-guild-org/federation"
                  >
                    Open Source composition library
                  </a>{' '}
                  is not yet compatible with subgraphs of your project. We're working on it!
                  <br />
                  To determine the cause of this issue, view the{' '}
                  <Link
                    variant="primary"
                    target="_blank"
                    to={`/native-composition-compatibility-report/${projectQuery.data.project.id}`}
                  >
                    Native Composition Report
                  </Link>
                  .<br />
                  <br />
                  If unclear, please reach out to us to explore solutions for addressing this issue.
                </>
              ) : null}
              {projectQuery.data.project.nativeFederationCompatibility.status ===
              NativeFederationCompatibilityStatusType.Unknown ? (
                <>
                  Your project appears to lack any subgraphs at the moment, making it impossible for
                  us to assess compatibility with our{' '}
                  <a
                    className={nativeCompositionStyles.link}
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

      <div className={nativeCompositionStyles.actions}>
        <Button
          onClick={() => enableNativeComposition()}
          disabled={isMutating || props.activeCompositionMode === 'native'}
        >
          {isMutating ? (
            <>
              <RefreshCcwIcon className={nativeCompositionStyles.spinner} />
              Please wait
            </>
          ) : props.activeCompositionMode === 'native' ? (
            'Using Native Composition'
          ) : (
            'Use Native Composition'
          )}
        </Button>
        <div>
          <Button
            variant="link"
            anchor={{
              href: 'https://github.com/the-guild-org/federation?tab=readme-ov-file#compatibility',
            }}
          >
            Learn more about risks and compatibility with other composition libraries
          </Button>
        </div>
      </div>
    </div>
  );
}
