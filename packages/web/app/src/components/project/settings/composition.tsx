import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FragmentType, graphql, useFragment } from '@/gql';
import { UpdateSchemaCompositionInput } from '@/gql/graphql';
import { cn } from '@/lib/utils';
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
        ...CompositionSettings_ProjectFragment
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
    <Card>
      <CardHeader>
        <CardTitle>
          <a id="composition">Schema Composition</a>
        </CardTitle>
        <CardDescription>Configure how your schemas are composed.</CardDescription>
      </CardHeader>
      <CardContent>
        {projectQuery.fetching ? (
          <Spinner />
        ) : (
          <Tabs value={selectedMode ?? activeMode} onValueChange={setSelectedMode}>
            <TabsList variant="content">
              <TabsTrigger variant="content" value="native">
                Native Federation v2
                {activeMode === 'native' && <CheckIcon size={16} className="ml-2 inline-block" />}
              </TabsTrigger>
              <TabsTrigger variant="content" value="external">
                External
                {activeMode === 'external' && <CheckIcon size={16} className="ml-2 inline-block" />}
              </TabsTrigger>
              <TabsTrigger
                variant="content"
                value="legacy"
                className={cn(
                  'hover:opacity-100 data-[state=active]:opacity-100',
                  activeMode === 'legacy' ? 'opacity-100' : 'opacity-40',
                )}
              >
                Legacy Federation v1
                {activeMode === 'legacy' && <CheckIcon size={16} className="ml-2 inline-block" />}
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="content" value="native">
              <NativeCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
                onMutate={onMutate}
              />
            </TabsContent>
            <TabsContent variant="content" value="external">
              <ExternalCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
                onMutate={onMutate}
              />
            </TabsContent>
            <TabsContent variant="content" value="legacy">
              <LegacyCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
                onMutate={onMutate}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
