import {
  deleteSchema,
  publishSchema,
  schemaVersionPromote,
  waitForExpectations,
} from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { maskToken } from '@hive/service-common';
import { clickHouseQuery } from '../../../testkit/clickhouse';

const ApproveFailedSchemaCheckMutation = graphql(/* GraphQL */ `
  mutation ApproveFailedSchemaCheckAuditLog($input: ApproveFailedSchemaCheckInput!) {
    approveFailedSchemaCheck(input: $input) {
      ok {
        schemaCheck {
          __typename
        }
      }
      error {
        message
      }
    }
  }
`);

async function getSchemaAuditLogs(organizationId: string) {
  const result = await clickHouseQuery<{
    eventAction: string;
    userEmail: string;
    accessTokenId: string;
    metadata: string;
  }>(`
    SELECT
      event_action AS "eventAction"
      , user_email AS "userEmail"
      , access_token_id AS "accessTokenId"
      , metadata
    FROM audit_logs
    WHERE organization_id = '${organizationId}'
      AND startsWith(event_action, 'SCHEMA_')
  `);
  return result.data.map(row => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

test.concurrent(
  'schema publish, delete, promotion and check approval are recorded once they took effect',
  async ({ expect }) => {
    const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken, organization } = await createOrg();
    const { project, target, createTargetAccessToken } = await createProject(
      ProjectType.Federation,
    );
    const organizationAccessToken = await createOrganizationAccessToken({
      resources: { mode: ResourceAssignmentModeType.All },
      permissions: [
        'schemaVersion:publish',
        'schemaVersion:deleteService',
        'schemaVersion:promote',
      ],
    });
    const accessKey = organizationAccessToken.privateAccessKey;
    const targetReference = { byId: target.id };

    const publishA = {
      author: 'a',
      commit: 'a',
      sdl: /* GraphQL */ `
        type Query {
          a: String!
        }
      `,
      service: 'a',
      url: 'http://a',
      target: targetReference,
    };
    await publishSchema(publishA, accessKey).then(r => r.expectNoGraphQLErrors());
    await publishSchema(
      {
        author: 'b',
        commit: 'b',
        sdl: /* GraphQL */ `
          type Query {
            b: String!
          }
        `,
        service: 'b',
        url: 'http://b',
        target: targetReference,
      },
      accessKey,
    ).then(r => r.expectNoGraphQLErrors());

    // Neither an unchanged publish nor a dry run creates a schema version.
    await publishSchema(publishA, accessKey).then(r => r.expectNoGraphQLErrors());
    await deleteSchema({ serviceName: 'b', dryRun: true, target: targetReference }, accessKey).then(
      r => r.expectNoGraphQLErrors(),
    );

    await deleteSchema(
      { serviceName: 'b', dryRun: false, target: targetReference },
      accessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: { fromTarget: targetReference },
        target: { toTarget: targetReference },
      },
      accessKey,
    ).then(r => r.expectNoGraphQLErrors());
    const promotedSchemaVersionId = promoteResult.schemaVersionPromote.ok?.newSchemaVersion.id;
    expect(promotedSchemaVersionId).toEqual(expect.any(String));

    const legacyToken = await createTargetAccessToken({});
    await legacyToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String!
            a2: String!
          }
        `,
        service: 'a',
        url: 'http://a',
      })
      .then(r => r.expectNoGraphQLErrors());

    const checkResult = await legacyToken
      .checkSchema(
        /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        'a',
      )
      .then(r => r.expectNoGraphQLErrors());
    if (checkResult.schemaCheck.__typename !== 'SchemaCheckError') {
      throw new Error(`Expected SchemaCheckError, got ${checkResult.schemaCheck.__typename}`);
    }
    const schemaCheckId = checkResult.schemaCheck.schemaCheck?.id;

    const approveResult = await execute({
      document: ApproveFailedSchemaCheckMutation,
      variables: {
        input: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
          schemaCheckId: schemaCheckId!,
        },
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());
    expect(approveResult.approveFailedSchemaCheck.error).toBeNull();

    const byOrganizationAccessToken = {
      userEmail: '',
      accessTokenId: organizationAccessToken.createdOrganizationAccessToken.id,
    };
    const location = { projectId: project.id, targetId: target.id };

    await waitForExpectations(async () => {
      const events = await getSchemaAuditLogs(organization.id);
      expect(events).toHaveLength(6);
      expect(events).toEqual(
        expect.arrayContaining([
          {
            eventAction: 'SCHEMA_PUBLISHED',
            ...byOrganizationAccessToken,
            metadata: expect.objectContaining({ ...location, serviceName: 'a' }),
          },
          {
            eventAction: 'SCHEMA_PUBLISHED',
            ...byOrganizationAccessToken,
            metadata: expect.objectContaining({ ...location, serviceName: 'b' }),
          },
          {
            eventAction: 'SCHEMA_DELETED',
            ...byOrganizationAccessToken,
            metadata: expect.objectContaining({ ...location, serviceName: 'b' }),
          },
          {
            eventAction: 'SCHEMA_VERSION_PROMOTED',
            ...byOrganizationAccessToken,
            metadata: expect.objectContaining({
              ...location,
              schemaVersionId: promotedSchemaVersionId,
              sourceTargetId: target.id,
            }),
          },
          {
            eventAction: 'SCHEMA_PUBLISHED',
            userEmail: '',
            accessTokenId: '',
            metadata: expect.objectContaining({
              ...location,
              serviceName: 'a',
              targetAccessToken: { token: maskToken(legacyToken.token.id) },
            }),
          },
          {
            eventAction: 'SCHEMA_CHECK_APPROVED',
            userEmail: ownerEmail,
            accessTokenId: '',
            metadata: expect.objectContaining({ ...location, schemaCheckId, serviceName: 'a' }),
          },
        ]),
      );
    });
  },
);
