import { ProjectType } from 'testkit/gql/graphql';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { VALID_POLICY } from '../../../testkit/schema-policy';
import { initSeed } from '../../../testkit/seed';

describe('Policy Access', () => {
  describe('Project', () => {
    const query = graphql(`
      query ProjectSchemaPolicyAccess($selector: ProjectSelectorInput!) {
        project(reference: { bySelector: $selector }) {
          schemaPolicy {
            id
          }
        }
      }
    `);

    const mutation = graphql(`
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
              }
            }
            updatedPolicy {
              id
              updatedAt
              rules {
                rule {
                  id
                }
                severity
                configuration
              }
            }
          }
        }
      }
    `);

    test.concurrent(
      'should successfully update Project.schemaPolicy if the user has access to SETTINGS',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, createProject, inviteAndJoinMember } = await createOrg();
        const { project } = await createProject(ProjectType.Single);
        const adminRole = organization.memberRoles?.find(r => r.name === 'Admin');

        if (!adminRole) {
          throw new Error('Admin role not found');
        }

        const { member, memberToken, assignMemberRole } = await inviteAndJoinMember();
        await assignMemberRole({
          roleId: adminRole.id,
          userId: member.user.id,
        });

        const result = await execute({
          document: mutation,
          variables: {
            selector: {
              organizationSlug: organization.slug,
              projectSlug: project.slug,
            },
            policy: VALID_POLICY,
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());

        expect(result.updateSchemaPolicyForProject.ok?.updatedPolicy.id).toBeTruthy();
      },
    );

    test.concurrent(
      'should fail to update Project.schemaPolicy if the user lacks access to SETTINGS',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, createProject, inviteAndJoinMember } = await createOrg();
        const { project } = await createProject(ProjectType.Single);
        const { memberToken } = await inviteAndJoinMember();

        const result = await execute({
          document: mutation,
          variables: {
            selector: {
              organizationSlug: organization.slug,
              projectSlug: project.slug,
            },
            policy: VALID_POLICY,
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());
        expect(result.updateSchemaPolicyForProject.error?.message).toBe(
          'No access (reason: "Missing permission for performing \'schemaLinting:modifyProjectRules\' on resource")',
        );
      },
    );

    test.concurrent(
      'should successfully fetch Project.schemaPolicy if the user has access to read:project',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, createProject, inviteAndJoinMember } = await createOrg();
        const { project } = await createProject(ProjectType.Single);
        const { memberToken } = await inviteAndJoinMember();

        const result = await execute({
          document: query,
          variables: {
            selector: {
              organizationSlug: organization.slug,
              projectSlug: project.slug,
            },
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());

        expect(result.project?.schemaPolicy?.id).not.toBeNull();
      },
    );
  });

  describe('Organization', () => {
    const query = graphql(`
      query OrganizationSchemaPolicyAccess($selector: OrganizationSelectorInput!) {
        organization(reference: { bySelector: $selector }) {
          schemaPolicy {
            id
          }
        }
      }
    `);
    const mutation = graphql(`
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
              }
            }
            updatedPolicy {
              id
              allowOverrides
              updatedAt
              rules {
                rule {
                  id
                }
                severity
                configuration
              }
            }
          }
        }
      }
    `);
    test.concurrent(
      'should successfully update Organization.schemaPolicy if the user has access to SETTINGS',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, inviteAndJoinMember } = await createOrg();
        const adminRole = organization.memberRoles?.find(r => r.name === 'Admin');

        if (!adminRole) {
          throw new Error('Admin role not found');
        }

        const { member, memberToken, assignMemberRole } = await inviteAndJoinMember();
        await assignMemberRole({
          roleId: adminRole.id,
          userId: member.user.id,
        });

        const result = await execute({
          document: mutation,
          variables: {
            selector: {
              organizationSlug: organization.slug,
            },
            policy: VALID_POLICY,
            allowOverrides: true,
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());

        expect(
          result.updateSchemaPolicyForOrganization.ok?.organization?.schemaPolicy?.id,
        ).not.toBeNull();
      },
    );

    test.concurrent(
      'should fail to update Organization.schemaPolicy if the user lacks access to SETTINGS',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, inviteAndJoinMember } = await createOrg();

        const { memberToken } = await inviteAndJoinMember();

        const result = await execute({
          document: mutation,
          variables: {
            selector: {
              organizationSlug: organization.slug,
            },
            policy: VALID_POLICY,
            allowOverrides: true,
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());
        expect(result.updateSchemaPolicyForOrganization.error?.message).toBe(
          'No access (reason: "Missing permission for performing \'schemaLinting:modifyOrganizationRules\' on resource")',
        );
      },
    );

    test.concurrent(
      'should successfully fetch Organization.schemaPolicy if the user has access to read:org',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { organization, inviteAndJoinMember, setOrganizationSchemaPolicy } =
          await createOrg();
        await setOrganizationSchemaPolicy(VALID_POLICY, true);

        const { memberToken } = await inviteAndJoinMember();

        const result = await execute({
          document: query,
          variables: {
            selector: {
              organizationSlug: organization.slug,
            },
          },
          authToken: memberToken,
        }).then(r => r.expectNoGraphQLErrors());
        expect(result.organization?.schemaPolicy?.id).not.toBeNull();
      },
    );
  });
});
