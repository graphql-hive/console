import { useState } from 'react';
import { useQuery } from 'urql';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ApolloCompositionSettings } from './apollo-composition';
import { ExternalCompositionSettings } from './external-composition';
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
    ...ApolloCompositionSettings_OrganizationFragment
  }
`);

const CompositionSettings_ProjectFragment = graphql(`
  fragment CompositionSettings_ProjectFragment on Project {
    slug
    isNativeFederationEnabled
    externalSchemaComposition {
      endpoint
    }
    ...NativeCompositionSettings_ProjectFragment
    ...ExternalCompositionSettings_ProjectFragment
    ...ApolloCompositionSettings_ProjectFragment
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
      : 'apollo';
  const [selectedMode, setSelectedMode] = useState<string>();

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
              </TabsTrigger>
              <TabsTrigger variant="content" value="external">
                External
              </TabsTrigger>
              <TabsTrigger variant="content" value="apollo">
                Apollo (Legacy)
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="content" value="native">
              <NativeCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
              />
            </TabsContent>
            <TabsContent variant="content" value="external">
              <ExternalCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
              />
            </TabsContent>
            <TabsContent variant="content" value="apollo">
              <ApolloCompositionSettings
                project={project}
                organization={organization}
                activeCompositionMode={activeMode}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
