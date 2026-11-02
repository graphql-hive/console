import 'reflect-metadata';
import asyncRetry from 'async-retry';
import { clickHouseQuery, flushAsyncInserts } from 'testkit/clickhouse';
import { addAlertChannel } from 'testkit/flow';
import { AlertChannelType, AlertType, ProjectType } from 'testkit/gql/graphql';
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
    const { createOrg } = await initSeed().createOwner();
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

    // No expectation is registered for this path, so the mock server answers 404.
    const rejected = await addAlertChannel({
      name: 'discord-rejected',
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      type: AlertChannelType.Discord,
      webhook: { endpoint: `http://mock_server:3042/random/no-expectation-${acceptedId}` },
    });
    if (!rejected.ok) {
      throw new Error(rejected.error?.message ?? 'Expected ok');
    }
    const rejectedId = rejected.ok.addedAlertChannel.id;

    // The confirmation message is sent and awaited inside the mutation, so both rows exist once
    // the async insert queue is flushed.
    await flushAsyncInserts();
    const { data: rows } = await clickHouseQuery<{
      channel_id: string;
      channel_type: string;
      event: string;
      ok: number;
      status_code: number;
      status_text: string;
      metadata: Record<string, string>;
    }>(
      `SELECT channel_id, channel_type, event, ok, status_code, status_text, metadata
       FROM alert_channel_deliveries
       WHERE channel_id IN ('${acceptedId}', '${rejectedId}')`,
    );

    const acceptedRow = rows.find(row => row.channel_id === acceptedId);
    expect(acceptedRow).toEqual(
      expect.objectContaining({
        channel_type: 'DISCORD',
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

    expect(rows.find(row => row.channel_id === rejectedId)).toEqual(
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
  },
);
