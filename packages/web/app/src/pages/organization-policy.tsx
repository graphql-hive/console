import { ReactElement } from 'react';
import { useMutation, useQuery } from 'urql';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { PolicySettings } from '@/components/policy/policy-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';

const OrganizationPolicyPageQuery = graphql(`
  query OrganizationPolicyPageQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      projects {
        nodes {
          id
          slug
        }
      }
      schemaPolicy {
        id
        updatedAt
        ...PolicySettings_SchemaPolicyFragment
      }
      viewerCanModifySchemaPolicy
    }
  }
`);

const UpdateSchemaPolicyForOrganization = graphql(`
  mutation UpdateSchemaPolicyForOrganization(
    $selector: OrganizationSelectorInput!
    $policy: SchemaPolicyInput!
    $allowOverrides: Boolean!
  ) {
    updateSchemaPolicyForOrganization(
      selector: $selector
      policy: $policy
      allowOverrides: $allowOverrides
    ) {
      error {
        message
      }
      ok {
        organization {
          id
          schemaPolicy {
            id
            updatedAt
            allowOverrides
            ...PolicySettings_SchemaPolicyFragment
          }
        }
      }
    }
  }
`);

function PolicyPageContent(props: { organizationSlug: string }) {
  const [query] = useQuery({
    query: OrganizationPolicyPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
  });
  const [mutation, mutate] = useMutation(UpdateSchemaPolicyForOrganization);
  const { toast } = useToast();

  const currentOrganization = query.data?.organization;

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  return (
    <OrganizationLayout
      page={Page.Policy}
      organizationSlug={props.organizationSlug}
      className="flex flex-col gap-y-10"
    >
      <div>
        <div className="py-6">
          <Title>Organization Schema Policy</Title>
          <Subtitle>
            Schema Policies enable developers to define additional semantic checks on the GraphQL
            schema.
          </Subtitle>
        </div>
        {currentOrganization ? (
          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
              <CardDescription>
                At the organizational level, policies can be defined to affect all projects and
                targets.
                <br />
                At the project level, policies can be overridden or extended.
                <br />
                <DocsLink className="text-muted-foreground" href="/features/schema-policy">
                  Learn more
                </DocsLink>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PolicySettings
                saving={mutation.fetching}
                error={
                  mutation.error?.message ||
                  mutation.data?.updateSchemaPolicyForOrganization.error?.message
                }
                onSave={
                  currentOrganization.viewerCanModifySchemaPolicy
                    ? async (newPolicy, allowOverrides) => {
                        await mutate({
                          selector: {
                            organizationSlug: props.organizationSlug,
                          },
                          policy: newPolicy,
                          allowOverrides,
                        })
                          .then(result => {
                            if (
                              result.data?.updateSchemaPolicyForOrganization.error ||
                              result.error
                            ) {
                              toast({
                                variant: 'destructive',
                                title: 'Error',
                                description:
                                  result.data?.updateSchemaPolicyForOrganization.error?.message ||
                                  result.error?.message,
                              });
                            } else {
                              toast({
                                variant: 'default',
                                title: 'Success',
                                description: 'Policy updated successfully',
                              });
                            }
                          })
                          .catch();
                      }
                    : null
                }
                currentState={currentOrganization.schemaPolicy}
              >
                {form => (
                  <div className="flex items-center pl-1 pt-2">
                    <Checkbox
                      id="allowOverrides"
                      checked={form.values.allowOverrides}
                      value="allowOverrides"
                      onCheckedChange={newValue => form.setFieldValue('allowOverrides', newValue)}
                      disabled={!currentOrganization.viewerCanModifySchemaPolicy}
                    />
                    <label
                      htmlFor="allowOverrides"
                      className="ml-2 inline-block text-sm text-gray-300"
                    >
                      Allow projects to override or disable rules
                    </label>
                  </div>
                )}
              </PolicySettings>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </OrganizationLayout>
  );
}

export function OrganizationPolicyPage(props: { organizationSlug: string }): ReactElement {
  return (
    <>
      <Meta title="Organization Schema Policy" />
      <PolicyPageContent organizationSlug={props.organizationSlug} />
    </>
  );
}
