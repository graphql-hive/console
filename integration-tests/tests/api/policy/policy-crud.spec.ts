import { ProjectType } from 'testkit/gql/graphql';
import { execute } from '../../../testkit/graphql';
import {
  EMPTY_RULE_CONFIG_POLICY,
  INVALID_RULE_CONFIG_POLICY,
  INVALID_RULE_POLICY,
  LONGER_VALID_POLICY,
  OrganizationAndProjectsWithSchemaPolicy,
  VALID_POLICY,
} from '../../../testkit/schema-policy';
import { initSeed } from '../../../testkit/seed';

describe('Policy CRUD', () => {
  describe('Project level', () => {
    test.concurrent(
      'creating a project should NOT create a record in the database for the policy',
      async ({ expect }) => {
        const { createOrg, ownerToken } = await initSeed().createOwner();
        const { organization, createProject } = await createOrg();
        await createProject(ProjectType.Single);

        const result = await execute({
          document: OrganizationAndProjectsWithSchemaPolicy,
          variables: {
            organization: organization.slug,
          },
          authToken: ownerToken,
        }).then(r => r.expectNoGraphQLErrors());

        expect(result.organization?.schemaPolicy).toBe(null);
        expect(result.organization?.projects.edges).toHaveLength(1);
        expect(result.organization?.projects.edges[0].node.schemaPolicy).toBeNull();
      },
    );

    test('upserting a configuration works as expected on a project level', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { project, setProjectSchemaPolicy } = await createProject(ProjectType.Single);

      const upsertResult = await setProjectSchemaPolicy(VALID_POLICY);
      expect(upsertResult.error).toBeNull();
      expect(upsertResult.ok).toBeDefined();
      expect(upsertResult.ok?.updatedPolicy.id).toBe(`PROJECT_${project.id}`);
      expect(upsertResult.ok?.updatedPolicy.id).toBe(upsertResult.ok?.project?.schemaPolicy?.id);
      expect(upsertResult.ok?.updatedPolicy.rules).toHaveLength(1);
      expect(upsertResult.ok?.updatedPolicy.rules[0]).toMatchInlineSnapshot(`
            {
              configuration: {
                types: true,
              },
              rule: {
                id: require-description,
              },
              severity: ERROR,
            }
          `);

      const upsertAgainResult = await setProjectSchemaPolicy(LONGER_VALID_POLICY);

      expect(upsertAgainResult.error).toBeNull();
      expect(upsertAgainResult.ok).toBeDefined();
      // To make sure upsert works
      expect(upsertResult.ok?.updatedPolicy.id).toBe(upsertAgainResult.ok?.updatedPolicy?.id);
      expect(upsertAgainResult.ok?.updatedPolicy.id).toBe(
        upsertAgainResult.ok?.project?.schemaPolicy?.id,
      );
      expect(upsertAgainResult.ok?.updatedPolicy.rules).toMatchInlineSnapshot(`
          [
            {
              configuration: {
                style: inline,
              },
              rule: {
                id: description-style,
              },
              severity: WARNING,
            },
            {
              configuration: {
                FieldDefinition: true,
                types: true,
              },
              rule: {
                id: require-description,
              },
              severity: ERROR,
            },
          ]
        `);
    });

    test('project level update is rejected when org does not allow to override', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject, setOrganizationSchemaPolicy } = await createOrg();
      const { setProjectSchemaPolicy } = await createProject(ProjectType.Single);

      const orgResult = await setOrganizationSchemaPolicy(VALID_POLICY, false);
      expect(orgResult.error).toBeNull();
      expect(orgResult.ok).toBeDefined();

      const result = await setProjectSchemaPolicy(LONGER_VALID_POLICY);
      expect(result.ok).toBeNull();
      expect(result.error?.message).toBe(
        `Organization policy does not allow overrides for schema policy at the project level.`,
      );
    });
  });

  describe('Org level', () => {
    test.concurrent(
      'creating a org should NOT create a record in the database for the policy',
      async ({ expect }) => {
        const { createOrg, ownerToken } = await initSeed().createOwner();
        const { organization, createProject } = await createOrg();
        await createProject(ProjectType.Single);

        const result = await execute({
          document: OrganizationAndProjectsWithSchemaPolicy,
          variables: {
            organization: organization.slug,
          },
          authToken: ownerToken,
        }).then(r => r.expectNoGraphQLErrors());

        expect(result.organization?.projects.edges).toHaveLength(1);
        expect(result.organization?.projects.edges[0].node.schemaPolicy).toBeNull();
      },
    );

    test.concurrent('invalid rule name is rejected with an error', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject, setOrganizationSchemaPolicy } = await createOrg();
      await createProject(ProjectType.Single);

      const upsertResult = await setOrganizationSchemaPolicy(INVALID_RULE_POLICY, true);
      expect(upsertResult.ok).toBeNull();
      expect(upsertResult.error).toBeDefined();
      expect(upsertResult.error?.message).toContain('Unknown rule name passed');
    });

    test.concurrent('invalid rule config is rejected with an error', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject, setOrganizationSchemaPolicy } = await createOrg();
      await createProject(ProjectType.Single);

      const upsertResult = await setOrganizationSchemaPolicy(INVALID_RULE_CONFIG_POLICY, true);
      expect(upsertResult.ok).toBeNull();
      expect(upsertResult.error).toBeDefined();
      expect(upsertResult.error?.message).toBe(
        'Failed to validate rule "require-description" configuration: data/0 must NOT have additional properties',
      );
    });

    test.concurrent('empty rule config is rejected with an error', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject, setOrganizationSchemaPolicy } = await createOrg();
      await createProject(ProjectType.Single);

      const upsertResult = await setOrganizationSchemaPolicy(EMPTY_RULE_CONFIG_POLICY, true);
      expect(upsertResult.ok).toBeNull();
      expect(upsertResult.error).toBeDefined();
      expect(upsertResult.error?.message).toBe(
        'Failed to validate rule "require-description" configuration: data/0 must NOT have fewer than 1 properties',
      );
    });

    test('updating an org policy for the should upsert the policy record in the database', async () => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { organization, createProject, setOrganizationSchemaPolicy } = await createOrg();
      await createProject(ProjectType.Single);

      const result = await execute({
        document: OrganizationAndProjectsWithSchemaPolicy,
        variables: {
          organization: organization.slug,
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result.organization?.schemaPolicy).toBe(null);
      expect(result.organization?.projects.edges).toHaveLength(1);
      expect(result.organization?.projects.edges[0].node.schemaPolicy).toBeNull();

      const upsertResult = await setOrganizationSchemaPolicy(VALID_POLICY, true);

      expect(upsertResult.error).toBeNull();
      expect(upsertResult.ok).toBeDefined();
      expect(upsertResult.ok?.updatedPolicy.id).toBe(`ORGANIZATION_${organization.id}`);
      expect(upsertResult.ok?.updatedPolicy.id).toBe(
        upsertResult.ok?.organization?.schemaPolicy?.id,
      );
      expect(upsertResult.ok?.updatedPolicy.rules).toHaveLength(1);
      expect(upsertResult.ok?.updatedPolicy.rules[0]).toMatchInlineSnapshot(`
          {
            configuration: {
              types: true,
            },
            rule: {
              id: require-description,
            },
            severity: ERROR,
          }
        `);

      const upsertAgainResult = await setOrganizationSchemaPolicy(LONGER_VALID_POLICY, true);

      expect(upsertAgainResult.error).toBeNull();
      expect(upsertAgainResult.ok).toBeDefined();
      // To make sure upsert works
      expect(upsertResult.ok?.updatedPolicy.id).toBe(upsertAgainResult.ok?.updatedPolicy?.id);
      expect(upsertAgainResult.ok?.updatedPolicy.id).toBe(
        upsertAgainResult.ok?.organization?.schemaPolicy?.id,
      );
    });
  });
});
