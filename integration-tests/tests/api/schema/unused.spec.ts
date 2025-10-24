import { addDays, formatISO } from 'date-fns';
import { ProjectType } from 'testkit/gql/graphql';
import { waitFor } from '../../../testkit/flow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const IntegrationTestsUnusedSchemaQuery = graphql(/* GraphQL */ `
  query IntegrationTestsUnusedSchema(
    $usagePeriod: DateRangeInput!
    $targetRef: TargetReferenceInput!
  ) {
    latestValidVersion(target: $targetRef) {
      unusedSchema(period: { absoluteRange: $usagePeriod }) {
        types {
          __typename
          ... on GraphQLObjectType {
            name
            fields {
              name
              usage {
                isUsed
              }
            }
          }
        }
      }
    }
  }
`);

test.concurrent(
  'a field from a type extension should be a part of unused schema if unused',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target, waitForOperationsCollected } = await createProject(
      ProjectType.Single,
    );

    // Create a token with write rights
    const writeToken = await createTargetAccessToken({});

    // Publish schema with write rights
    const publishResult = await writeToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
          }

          extend type User {
            name: String
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());
    // Schema publish should be successful
    expect(publishResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');

    const period = {
      from: formatISO(addDays(new Date(), -7)),
      to: formatISO(addDays(new Date(), 1)),
    };

    const firstQuery = await execute({
      document: IntegrationTestsUnusedSchemaQuery,
      variables: {
        targetRef: {
          byId: target.id,
        },
        usagePeriod: period,
      },
      authToken: writeToken.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(firstQuery.latestValidVersion?.unusedSchema?.types).toHaveLength(2);

    let userType = firstQuery.latestValidVersion?.unusedSchema?.types.find(t =>
      'name' in t ? t.name === 'User' : false,
    );

    if (!userType) {
      throw new Error('User type not found');
    }

    if (userType.__typename !== 'GraphQLObjectType') {
      throw new Error('User type is not an object type');
    }

    let idField = userType.fields.find(f => f.name === 'id');
    let nameField = userType.fields.find(f => f.name === 'name');

    expect(idField?.usage.isUsed).toEqual(false);
    expect(nameField, 'User.name should exist').toBeDefined();
    expect(nameField?.usage.isUsed, 'User.name should be unused').toEqual(false);

    // mark name field as used
    const collectResult = await writeToken.collectUsage({
      size: 1,
      map: {
        op1: {
          operation: 'query UserName { user { name } }',
          operationName: 'UserName',
          fields: ['Query', 'Query.user', 'User', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 200_000_000,
            errorsTotal: 0,
          },
        },
      ],
    });
    expect(collectResult.status).toEqual(200);
    await waitForOperationsCollected(1);

    const secondQuery = await execute({
      document: IntegrationTestsUnusedSchemaQuery,
      variables: {
        targetRef: {
          byId: target.id,
        },
        usagePeriod: period,
      },
      authToken: writeToken.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(secondQuery.latestValidVersion?.unusedSchema?.types).toHaveLength(1);

    userType = secondQuery.latestValidVersion?.unusedSchema?.types.find(t =>
      'name' in t ? t.name === 'User' : false,
    );

    if (!userType) {
      throw new Error('User type not found');
    }

    if (userType.__typename !== 'GraphQLObjectType') {
      throw new Error('User type is not an object type');
    }

    idField = userType.fields.find(f => f.name === 'id');
    nameField = userType.fields.find(f => f.name === 'name');

    expect(idField?.usage.isUsed).toEqual(false);
    expect(nameField, 'User.name should not be used').toEqual(undefined);
  },
);


import { addDays, formatISO } from 'date-fns';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';
import { test } from '../../../testkit/playwright';

test.concurrent(
  'shows a placeholder in the Unused tab when all schema elements are used',
  async ({ page, expect, supertokens }) => {
    // SETUP: Create a schema and report usage for all its fields so that the "unused" list is empty.
    const { owner, createOrg } = await initSeed().createOwner();
    const { project, organization, createProject } = await createOrg();
    const { createTargetAccessToken, target, waitForOperationsCollected } = await createProject(
      ProjectType.Single,
    );

    const writeToken = await createTargetAccessToken({});

    await writeToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            user: User!
          }
          type User {
            id: ID!
            name: String
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());

    await writeToken
      .collectUsage({
        size: 1,
        map: {
          op1: {
            operation: 'query AllFields { user { id name } }',
            operationName: 'AllFields',
            fields: ['Query', 'Query.user', 'User', 'User.id', 'User.name'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
          },
        ],
      })
      .then(r => expect(r.status).toEqual(200));

    await waitForOperationsCollected(1);

    // ACTIONS: Navigate to the Schema Explorer and click the "Unused" tab.
    await supertokens.login({ email: owner.email, user: owner });
    await page.goto(`/${organization.cleanId}/${project.cleanId}/${target.cleanId}/schema/explorer`);

    const unusedTab = page.getByRole('tab', { name: 'Unused' });
    await expect(unusedTab).toBeVisible();
    await unusedTab.click();

    // ASSERTIONS: Verify the UI renders correctly without any unused data.
    // 1. All tabs should still be visible.
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fields' })).toBeVisible();
    await expect(unusedTab).toBeVisible();

    // 2. The placeholder message for no data should be displayed, as per the plan.
    await expect(
      page.getByText('No usage data reported for this schema yet.'),
    ).toBeVisible();
  },
);