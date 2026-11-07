import 'reflect-metadata';
import asyncRetry from 'async-retry';
import { clickHouseInsert, clickHouseQuery, flushAsyncInserts } from 'testkit/clickhouse';
import { addAlertChannel } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { AlertChannelType, AlertType, ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { generateMockEndpoint, getRecordedRequests } from 'testkit/mock-server';
import { initSeed } from '../../../testkit/seed';

test.concurrent(
  'can add channel, alert and trigger schema change notification',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { createTargetAccessToken, project, target, fetchVersions, addAlert, addAlertChannel } =
      await createProject(ProjectType.Single);
    const readWriteToken = await createTargetAccessToken({});

    const result1 = await readWriteToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());

    expect(result1.schemaPublish.__typename).toBe('SchemaPublishSuccess');

    const organizationSlug = organization.slug;
    const projectSlug = project.slug;
    const targetSlug = target.slug;

    // add channel and alert
    const mockEndpoint = await generateMockEndpoint();
    const channelResult = await addAlertChannel({
      name: 'test',
      organizationSlug,
      projectSlug,
      type: AlertChannelType.Webhook,
      webhook: {
        endpoint: mockEndpoint.url,
      },
    });
    if (channelResult.error) {
      throw new Error(channelResult.error.message);
    }

    if (!channelResult.ok) {
      throw new Error('Expected ok');
    }
    expect(channelResult.ok.addedAlertChannel.name).toBe('test');

    const alertResult = await addAlert({
      organizationSlug,
      projectSlug,
      targetSlug,
      channelId: channelResult.ok.addedAlertChannel.id,
      type: AlertType.SchemaChangeNotifications,
    });

    if (alertResult.error) {
      throw new Error(alertResult.error.message);
    }

    if (!alertResult.ok) {
      throw new Error('Expected ok');
    }
    expect(alertResult.ok.addedAlert.target.slug).toBe(targetSlug);

    const recordedRequestsBefore = await getRecordedRequests();
    expect(recordedRequestsBefore).not.toContainEqual(
      expect.objectContaining({
        path: mockEndpoint.path,
      }),
    );

    const result2 = await readWriteToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
            pong: String
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());

    expect(result2.schemaPublish.__typename).toBe('SchemaPublishSuccess');

    const versionsResult = await fetchVersions(3);
    expect(versionsResult).toHaveLength(2);

    await asyncRetry(
      async () => {
        const recordedRequestsAfter = await getRecordedRequests();
        expect(recordedRequestsAfter).toContainEqual(
          expect.objectContaining({
            path: mockEndpoint.path,
          }),
        );
      },
      {
        retries: 5,
        maxTimeout: 2000,
      },
    );

    const channelId = channelResult.ok.addedAlertChannel.id;
    const recordedRequest = (await getRecordedRequests()).find(
      request => request.path === mockEndpoint.path,
    );
    const sentHeaders = Object.fromEntries(
      Object.entries(recordedRequest?.headers ?? {}).map(([name, values]) => [
        name.toLowerCase(),
        values[0],
      ]),
    );
    expect(sentHeaders).toEqual(
      expect.objectContaining({
        'hive-request-id': expect.any(String),
        'hive-event': 'schema_change',
        'hive-target-id': target.id,
        'hive-schema-id': expect.any(String),
        'idempotency-key': `schema-change:${sentHeaders['hive-schema-id']}:${channelId}`,
        'user-agent': expect.stringMatching(/^Hive-Webhooks\//),
      }),
    );

    // The workflows service records the delivery after the webhook answered.
    await asyncRetry(
      async () => {
        await flushAsyncInserts();
        const { data } = await clickHouseQuery<{
          delivery_type: string;
          event: string;
          ok: number;
          status_code: number;
          metadata: Record<string, string>;
        }>(
          `SELECT delivery_type, event, ok, status_code, metadata
           FROM outbound_deliveries
           WHERE destination = '${channelId}' AND event = 'schema_change'`,
        );
        expect(data).toContainEqual(
          expect.objectContaining({
            delivery_type: 'WEBHOOK',
            event: 'schema_change',
            ok: 1,
            status_code: 200,
            metadata: expect.objectContaining({
              'Hive-Request-ID': sentHeaders['hive-request-id'],
              'Hive-Event': 'schema_change',
              'Hive-Target-ID': target.id,
              'Hive-Schema-ID': sentHeaders['hive-schema-id'],
              'Idempotency-Key': sentHeaders['idempotency-key'],
            }),
          }),
        );
      },
      {
        retries: 5,
        maxTimeout: 2000,
      },
    );
  },
);

test.concurrent(
  'Mutation.addAlertChannel: invalid name, slack channel and webhook',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { organization, createProject } = await createOrg();
    const { project } = await createProject(ProjectType.Single);

    const emptySlack = await addAlertChannel(
      {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        name: '',
        type: AlertChannelType.Slack,
        slack: { channel: '' },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(emptySlack.addAlertChannel.error).toMatchInlineSnapshot(`
      {
        inputErrors: {
          name: Name is required,
          slackChannel: Slack channel is required, e.g. #alerts,
          webhookEndpoint: null,
        },
        message: Please check your input.,
      }
    `);

    const longSlack = await addAlertChannel(
      {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        name: 'a'.repeat(101),
        type: AlertChannelType.Slack,
        slack: { channel: 'b'.repeat(81) },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(longSlack.addAlertChannel.error).toMatchInlineSnapshot(`
      {
        inputErrors: {
          name: Name must be at most 100 characters long,
          slackChannel: Slack channel must be at most 80 characters long,
          webhookEndpoint: null,
        },
        message: Please check your input.,
      }
    `);

    const invalidWebhook = await addAlertChannel(
      {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        name: 'webhook',
        type: AlertChannelType.Webhook,
        webhook: { endpoint: 'not-a-url' },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(invalidWebhook.addAlertChannel.error).toMatchInlineSnapshot(`
      {
        inputErrors: {
          name: null,
          slackChannel: null,
          webhookEndpoint: Must be a valid URL, e.g. https://example.com/webhook,
        },
        message: Please check your input.,
      }
    `);

    const longWebhook = await addAlertChannel(
      {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        name: 'webhook',
        type: AlertChannelType.Webhook,
        webhook: { endpoint: `https://example.com/${'a'.repeat(500)}` },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(longWebhook.addAlertChannel.error).toMatchInlineSnapshot(`
      {
        inputErrors: {
          name: null,
          slackChannel: null,
          webhookEndpoint: URL must be at most 500 characters long,
        },
        message: Please check your input.,
      }
    `);
  },
);

test.concurrent(
  'records each channel confirmation delivery with the status and the headers Hive sent',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    const { project, addAlertChannel } = await createProject(ProjectType.Single);

    const mockEndpoint = await generateMockEndpoint();
    const accepted = await addAlertChannel({
      name: 'discord-accepted',
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      type: AlertChannelType.Discord,
      webhook: { endpoint: mockEndpoint.url },
    });
    if (!accepted.ok) {
      throw new Error(accepted.error?.message ?? 'Expected ok');
    }
    const acceptedId = accepted.ok.addedAlertChannel.id;

    // The same mock server, on a path with no expectation registered, so it answers 404.
    const rejectedEndpoint = new URL(`/random/no-expectation-${acceptedId}`, mockEndpoint.url).href;
    const rejected = await addAlertChannel({
      name: 'discord-rejected',
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      type: AlertChannelType.Discord,
      webhook: { endpoint: rejectedEndpoint },
    });
    if (!rejected.ok) {
      throw new Error(rejected.error?.message ?? 'Expected ok');
    }
    const rejectedId = rejected.ok.addedAlertChannel.id;

    // The confirmation message is sent and awaited inside the mutation, so both rows exist once
    // the async insert queue is flushed.
    await flushAsyncInserts();
    const { data: rows } = await clickHouseQuery<{
      destination: string;
      delivery_type: string;
      event: string;
      ok: number;
      status_code: number;
      status_text: string;
      metadata: Record<string, string>;
    }>(
      `SELECT destination, delivery_type, event, ok, status_code, status_text, metadata
       FROM outbound_deliveries
       WHERE destination IN ('${acceptedId}', '${rejectedId}')`,
    );

    const acceptedRow = rows.find(row => row.destination === acceptedId);
    expect(acceptedRow).toEqual(
      expect.objectContaining({
        delivery_type: 'DISCORD',
        event: 'channel_confirmation',
        ok: 1,
        status_code: 200,
        status_text: 'OK',
      }),
    );
    expect(acceptedRow?.metadata).toEqual({
      'Hive-Request-ID': expect.any(String),
      'Hive-Event': 'channel_confirmation',
      'User-Agent': expect.stringMatching(/^Hive-Webhooks\//),
      'Idempotency-Key': `channel-confirmation:created:${acceptedId}`,
    });

    expect(rows.find(row => row.destination === rejectedId)).toEqual(
      expect.objectContaining({
        event: 'channel_confirmation',
        ok: 0,
        status_code: 404,
      }),
    );

    const recorded = (await getRecordedRequests()).find(
      request => request.path === mockEndpoint.path,
    );
    const sentHeaders = Object.fromEntries(
      Object.entries(recorded?.headers ?? {}).map(([name, values]) => [
        name.toLowerCase(),
        values[0],
      ]),
    );
    expect(sentHeaders).toEqual(
      expect.objectContaining({
        'hive-request-id': acceptedRow?.metadata['Hive-Request-ID'],
        'hive-event': 'channel_confirmation',
        'idempotency-key': `channel-confirmation:created:${acceptedId}`,
        'user-agent': acceptedRow?.metadata['User-Agent'],
      }),
    );

    const period = {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(Date.now() + 60 * 1000).toISOString(),
    };
    const readDeliveries = (channelId: string) =>
      execute({
        document: AlertChannelDeliveriesQuery,
        variables: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          channelId,
          ...period,
        },
        authToken: ownerToken,
      })
        .then(r => r.expectNoGraphQLErrors())
        .then(r => r.project?.alertChannel ?? null);

    const acceptedChannel = await readDeliveries(acceptedId);
    expect(acceptedChannel?.deliveryHealth).toEqual({
      status: 'HEALTHY',
      lastSuccessAt: expect.any(String),
      lastFailureAt: null,
      lastStatusCode: null,
      lastStatusText: null,
      failingSince: null,
    });
    expect(acceptedChannel?.deliveryStats).toEqual(
      expect.objectContaining({ totalDeliveries: 1, totalFailures: 0 }),
    );
    expect(
      acceptedChannel?.deliveryStats?.deliveriesOverTime.reduce(
        (sum, bucket) => sum + bucket.value,
        0,
      ),
    ).toBe(1);
    expect(acceptedChannel?.deliveryLog).toEqual([
      {
        event: 'CHANNEL_CONFIRMATION',
        destination: acceptedId,
        ok: true,
        statusCode: 200,
        statusText: 'OK',
        attempt: 1,
        maxAttempts: 1,
        metadata: acceptedRow?.metadata,
      },
    ]);

    // One failed attempt is not a streak: the channel stays HEALTHY but reports the failure.
    const rejectedChannel = await readDeliveries(rejectedId);
    expect(rejectedChannel?.deliveryHealth).toEqual({
      status: 'HEALTHY',
      lastSuccessAt: null,
      lastFailureAt: expect.any(String),
      lastStatusCode: 404,
      lastStatusText: 'Not Found',
      failingSince: null,
    });
    expect(rejectedChannel?.deliveryStats).toEqual(
      expect.objectContaining({ totalDeliveries: 1, totalFailures: 1 }),
    );

    // Nine earlier failures complete the streak of ten that marks the channel as failing.
    await clickHouseInsert(`
      INSERT INTO "outbound_deliveries" (
        "timestamp", "organization_id", "delivery_type", "destination", "event", "attempt",
        "max_attempts", "ok", "status_code", "status_text", "duration_ms", "metadata"
      )
      SELECT
        now() - toIntervalMinute(number + 1), '${organization.id}', 'DISCORD', '${rejectedId}',
        'channel_confirmation', 1, 1, 0, 404, 'Not Found', 5, map('Hive-Event', 'channel_confirmation')
      FROM numbers(9)
    `);
    const failingChannel = await readDeliveries(rejectedId);
    expect(failingChannel?.deliveryHealth).toEqual(
      expect.objectContaining({
        status: 'FAILING',
        lastFailureAt: rejectedChannel?.deliveryHealth?.lastFailureAt,
        failingSince: expect.any(String),
      }),
    );
    expect(Date.parse(failingChannel?.deliveryHealth?.failingSince ?? '')).toBeLessThan(
      Date.parse(rejectedChannel?.deliveryHealth?.lastFailureAt ?? ''),
    );

    await expect(readDeliveries('00000000-0000-4000-8000-000000000000')).resolves.toBeNull();
  },
);

const AlertChannelDeliveriesQuery = graphql(`
  query IntegrationTests_AlertChannelDeliveries(
    $organizationSlug: String!
    $projectSlug: String!
    $channelId: ID!
    $from: DateTime!
    $to: DateTime!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      alertChannel(id: $channelId) {
        id
        deliveryHealth {
          status
          lastSuccessAt
          lastFailureAt
          lastStatusCode
          lastStatusText
          failingSince
        }
        deliveryStats(period: { from: $from, to: $to }) {
          totalDeliveries
          totalFailures
          deliveriesOverTime(resolution: 24) {
            value
          }
          failuresOverTime(resolution: 24) {
            value
          }
        }
        deliveryLog(period: { from: $from, to: $to }) {
          event
          destination
          ok
          statusCode
          statusText
          attempt
          maxAttempts
          metadata
        }
      }
    }
  }
`);
