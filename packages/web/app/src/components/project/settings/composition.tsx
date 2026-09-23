import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Tabs } from '@/components/base/tabs/tabs';
import { CheckIcon } from '@/components/ui/icon';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Spinner } from '@/components/ui/spinner';
import { FragmentType, graphql, useFragment } from '@/gql';
import { UpdateSchemaCompositionInput } from '@/gql/graphql';
import { ExternalCompositionSettings } from './external-composition';
import { LegacyCompositionSettings } from './legacy-composition';
import { NativeCompositionSettings } from './native-composition';

const CompositionSettings_ProjectConfigurationQuery = graphql(`
  query CompositionSettings_ProjectConfigurationQuery($selector: ProjectSelectorInput!) {
    project(reference: { bySelector: $selector }) {
      id
      ...CompositionSettings_ProjectFragment
    }
  }
`);

const CompositionSettings_OrganizationFragment = graphql(`
  fragment CompositionSettings_OrganizationFragment on Organization {
    slug
    ...NativeCompositionSettings_OrganizationFragment
    ...ExternalCompositionSettings_OrganizationFragment
    ...LegacyCompositionSettings_OrganizationFragment
  }
`);

const CompositionSettings_ProjectFragment = graphql(`
  fragment CompositionSettings_ProjectFragment on Project {
    id
    slug
    isNativeFederationEnabled
    externalSchemaComposition {
      endpoint
    }
    ...NativeCompositionSettings_ProjectFragment
    ...ExternalCompositionSettings_ProjectFragment
    ...LegacyCompositionSettings_ProjectFragment
  }
`);

const CompositionSettings_UpdateMutation = graphql(`
  mutation CompositionSettings_UpdateMutation($input: UpdateSchemaCompositionInput!) {
    updateSchemaComposition(input: $input) {
      ok {
        updatedProject {
          ...CompositionSettings_ProjectFragment
        }
      }
      ...NativeCompositionSettings_UpdateResultFragment
      ...ExternalCompositionSettings_UpdateResultFragment
      ...LegacyCompositionSettings_UpdateResultFragment
    }
  }
`);

export const CompositionSettings = (props: {
  project: FragmentType<typeof CompositionSettings_ProjectFragment>;
  organization: FragmentType<typeof CompositionSettings_OrganizationFragment>;
}) => {
  const project = useFragment(CompositionSettings_ProjectFragment, props.project);
  const organization = useFragment(CompositionSettings_OrganizationFragment, props.organization);

  const [projectQuery] = useQuery({
    query: CompositionSettings_ProjectConfigurationQuery,
    variables: {
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
      },
    },
  });

  const externalCompositionConfig = project.externalSchemaComposition;
  const nativeCompositionEnabled = project.isNativeFederationEnabled;
  const activeMode = nativeCompositionEnabled
    ? 'native'
    : externalCompositionConfig
      ? 'external'
      : 'legacy';
  const [selectedMode, setSelectedMode] = useState<string>();

  const [, mutate] = useMutation(CompositionSettings_UpdateMutation);
  const onMutate = async (input: UpdateSchemaCompositionInput) => {
    const result = await mutate({ input });
    if (result.error) return result.error;
    return result.data!.updateSchemaComposition;
  };

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Schema Composition"
        description="Configure how your schemas are composed"
      />
      <div>
        {projectQuery.fetching ? (
          <Spinner />
        ) : (
          <Tabs
            value={selectedMode ?? activeMode}
            onValueChange={setSelectedMode}
            items={[
              {
                value: 'native',
                label: (
                  <>
                    Native Federation v2
                    {activeMode === 'native' && <CheckIcon size={16} />}
                  </>
                ),
                content: (
                  <NativeCompositionSettings
                    project={project}
                    organization={organization}
                    activeCompositionMode={activeMode}
                    onMutate={onMutate}
                  />
                ),
              },
              {
                value: 'external',
                label: (
                  <>
                    External
                    {activeMode === 'external' && <CheckIcon size={16} />}
                  </>
                ),
                content: (
                  <ExternalCompositionSettings
                    project={project}
                    organization={organization}
                    activeCompositionMode={activeMode}
                    onMutate={onMutate}
                  />
                ),
              },
              {
                value: 'legacy',
                label: (
                  <>
                    Legacy Federation v1
                    {activeMode === 'legacy' && <CheckIcon size={16} />}
                  </>
                ),
                content: (
                  <LegacyCompositionSettings
                    project={project}
                    organization={organization}
                    activeCompositionMode={activeMode}
                    onMutate={onMutate}
                  />
                ),
              },
            ]}
          />
        )}
      </div>
    </SubPageLayout>
  );
};
