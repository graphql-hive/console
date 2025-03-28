import { useMutation, useQuery } from 'urql';
import { Page, ProjectLayout } from '@/components/layouts/project';
import { PolicySettings } from '@/components/policy/policy-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';

const ProjectPolicyPageQuery = graphql(`
  query ProjectPolicyPageQuery($organizationSlug: String!, $projectSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        schemaPolicy {
          id
          updatedAt
          ...PolicySettings_SchemaPolicyFragment
        }
        parentSchemaPolicy {
          id
          updatedAt
          allowOverrides
          rules {
            rule {
              id
            }
          }
        }
        viewerCanModifySchemaPolicy
      }
    }
  }
`);

const UpdateSchemaPolicyForProject = graphql(`
  mutation UpdateSchemaPolicyForProject(
    $selector: ProjectSelectorInput!
    $policy: SchemaPolicyInput!
  ) {
    updateSchemaPolicyForProject(selector: $selector, policy: $policy) {
      error {
        message
      }
      ok {
        project {
          id
          schemaPolicy {
            id
            updatedAt
            ...PolicySettings_SchemaPolicyFragment
          }
        }
      }
    }
  }
`);

function ProjectPolicyContent(props: { organizationSlug: string; projectSlug: string }) {
  const [mutation, mutate] = useMutation(UpdateSchemaPolicyForProject);
  const [query] = useQuery({
    query: ProjectPolicyPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
    },
    requestPolicy: 'cache-and-network',
  });
  const { toast } = useToast();

  const currentOrganization = query.data?.organization;
  const currentProject = currentOrganization?.project;

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <div>
      <div className="py-6">
        <Title>Project Schema Policy</Title>
        <Subtitle>
          Schema Policies enable developers to define additional semantic checks on the GraphQL
          schema.
        </Subtitle>
      </div>
      {currentProject && currentOrganization ? (
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>
              At the project level, policies can be defined to affect all targets, and override
              policy configuration defined at the organization level.
              <br />
              <DocsLink href="/features/schema-policy" className="text-muted-foreground text-sm">
                Learn more
              </DocsLink>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentProject.parentSchemaPolicy === null ||
            currentProject.parentSchemaPolicy?.allowOverrides ? (
              <PolicySettings
                saving={mutation.fetching}
                rulesInParent={currentProject.parentSchemaPolicy?.rules.map(r => r.rule.id)}
                error={
                  mutation.error?.message ||
                  mutation.data?.updateSchemaPolicyForProject.error?.message
                }
                onSave={
                  currentProject?.viewerCanModifySchemaPolicy
                    ? async newPolicy => {
                        await mutate({
                          selector: {
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                          },
                          policy: newPolicy,
                        }).then(result => {
                          if (result.error || result.data?.updateSchemaPolicyForProject.error) {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description:
                                result.error?.message ||
                                result.data?.updateSchemaPolicyForProject.error?.message,
                            });
                          } else {
                            toast({
                              variant: 'default',
                              title: 'Success',
                              description: 'Policy updated successfully',
                            });
                          }
                        });
                      }
                    : null
                }
                currentState={currentProject.schemaPolicy}
              />
            ) : (
              <div className="pl-1 text-sm font-bold text-gray-400">
                <p className="mr-4 inline-block text-orange-500">!</p>
                Organization settings does not allow projects to override policy. Please consult
                your organization administrator.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function ProjectPolicyPage(props: { organizationSlug: string; projectSlug: string }) {
  return (
    <>
      <Meta title="Project Schema Policy" />
      <ProjectLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        page={Page.Policy}
        className="flex flex-col gap-y-10"
      >
        <ProjectPolicyContent
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
        />
      </ProjectLayout>
    </>
  );
}
