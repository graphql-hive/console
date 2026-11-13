import 'reflect-metadata';
import asyncRetry from 'async-retry';
import { pollFor } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { AlertChannelType, AlertType, ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { generateMockEndpoint, getRecordedRequests } from 'testkit/mock-server';
import { NoopLogger } from '@hive/api/modules/shared/providers/logger';
import { psql } from '@hive/postgres';
import { TaskScheduler } from '@hive/workflows/kit';
import { DisableFailingAlertChannelsTask } from '@hive/workflows/tasks/disable-failing-alert-channels';
import { clickHouseInsert, flushAsyncInserts } from '../../../testkit/clickhouse';
import { initSeed } from '../../../testkit/seed';

const AlertChannelStateQuery = graphql(`
  query IntegrationTests_AlertChannelState(
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
        disabledAt
        disabledBy {
          displayName
        }
        deliveryHealth {
          status
          failingSince
        }
        deliveryLog(period: { from: $from, to: $to }) {
          ok
        }
      }
    }
  }
`);

const EnableAlertChannelMutation = graphql(`
  mutation IntegrationTests_EnableAlertChannel($input: EnableAlertChannelInput!) {
    enableAlertChannel(input: $input) {
      ok {
        enabledAlertChannel {
          id
          disabledAt
        }
      }
      error {
        message
      }
    }
  }
`);

const DisableAlertChannelMutation = graphql(`
  mutation IntegrationTests_DisableAlertChannel($input: DisableAlertChannelInput!) {
    disableAlertChannel(input: $input) {
      ok {
        disabledAlertChannel {
          id
          disabledAt
          disabledBy {
            id
          }
        }
      }
      error {
        message
      }
    }
  }
`);

function readChannel(
  selector: { organizationSlug: string; projectSlug: string },
  channelId: string,
  authToken: string,
) {
  return execute({
    document: AlertChannelStateQuery,
    variables: {
      ...selector,
      channelId,
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      to: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    authToken,
  })
    .then(r => r.expectNoGraphQLErrors())
    .then(r => r.project?.alertChannel ?? null);
}

function disableChannel(channelId: string, authToken: string) {
  return execute({
    document: DisableAlertChannelMutation,
    variables: { input: { channelId } },
    authToken,
  })
    .then(r => r.expectNoGraphQLErrors())
    .then(r => r.disableAlertChannel);
}

function enableChannel(channelId: string, authToken: string) {
  return execute({
    document: EnableAlertChannelMutation,
    variables: { input: { channelId } },
    authToken,
  })
    .then(r => r.expectNoGraphQLErrors())
    .then(r => r.enableAlertChannel);
}

test.concurrent("a channel's health counts from when it was last enabled", async ({ expect }) => {
  const seed = initSeed();
  const { createOrg, ownerToken } = await seed.createOwner();
  const { createProject, organization } = await createOrg();
  const { project, addAlertChannel } = await createProject(ProjectType.Single);
  const selector = { organizationSlug: organization.slug, projectSlug: project.slug };

  // Creating a Discord channel sends it a confirmation, which records one success.
  const endpoint = await generateMockEndpoint();
  const created = await addAlertChannel({
    ...selector,
    name: 'discord',
    type: AlertChannelType.Discord,
    webhook: { endpoint: endpoint.url },
  });
  if (!created.ok) {
    throw new Error(created.error?.message ?? 'Expected ok');
  }
  const channelId = created.ok.addedAlertChannel.id;

  // Ten failures after that success make the channel FAILING. They are stamped a few seconds
  // ahead so they sort after the confirmation without the test waiting for the clock.
  await flushAsyncInserts();
  await clickHouseInsert(`
    INSERT INTO "outbound_deliveries" (
      "timestamp", "organization_id", "delivery_type", "destination", "event", "attempt",
      "max_attempts", "ok", "status_code", "status_text", "duration_ms", "metadata"
    )
    SELECT
      now() + toIntervalSecond(number + 1), '${organization.id}', 'DISCORD', '${channelId}',
      'schema_change', 1, 1, 0, 404, 'Not Found', 5, map('Hive-Event', 'schema_change')
    FROM numbers(10)
  `);
  const failing = await readChannel(selector, channelId, ownerToken);
  expect(failing?.deliveryHealth).toEqual({ status: 'FAILING', failingSince: expect.any(String) });
  expect(failing?.deliveryLog).toHaveLength(11);

  // Enabled later than every recorded attempt: none of them counts any more, while the log
  // still has them all.
  await using db = await seed.createDbConnection();
  await db.pool.query(psql`
    UPDATE "alert_channels" SET "enabled_at" = now() + interval '1 minute' WHERE "id" = ${channelId}
  `);
  const reset = await readChannel(selector, channelId, ownerToken);
  expect(reset?.deliveryHealth).toEqual({ status: 'UNKNOWN', failingSince: null });
  expect(reset?.deliveryLog).toHaveLength(11);
});

test.concurrent(
  'a disabled channel is skipped, and notified again once it is enabled',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { createProject, organization } = await createOrg();
    const { createTargetAccessToken, project, target, addAlert, addAlertChannel } =
      await createProject(ProjectType.Single);
    const selector = { organizationSlug: organization.slug, projectSlug: project.slug };
    const token = await createTargetAccessToken({});

    const publish = (sdl: string) =>
      token
        .publishSchema({ sdl })
        .then(r => r.expectNoGraphQLErrors())
        .then(r => expect(r.schemaPublish.__typename).toBe('SchemaPublishSuccess'));
    await publish(/* GraphQL */ `
      type Query {
        ping: String
      }
    `);

    async function channelNotifiedAt(endpoint: { url: string }) {
      const created = await addAlertChannel({
        ...selector,
        name: 'discord',
        type: AlertChannelType.Discord,
        webhook: { endpoint: endpoint.url },
      });
      if (!created.ok) {
        throw new Error(created.error?.message ?? 'Expected ok');
      }
      const alert = await addAlert({
        ...selector,
        targetSlug: target.slug,
        channelId: created.ok.addedAlertChannel.id,
        type: AlertType.SchemaChangeNotifications,
      });
      if (!alert.ok) {
        throw new Error(alert.error?.message ?? 'Expected ok');
      }
      return created.ok.addedAlertChannel.id;
    }
    const live = await generateMockEndpoint();
    const dead = await generateMockEndpoint();
    const liveId = await channelNotifiedAt(live);
    const deadId = await channelNotifiedAt(dead);

    // Only a member with alert permissions on the channel's project may change it.
    const outsider = await seed.createOwner();
    const refused = await execute({
      document: DisableAlertChannelMutation,
      variables: { input: { channelId: liveId } },
      authToken: outsider.ownerToken,
    }).then(r => r.expectGraphQLErrors());
    expect(refused).toMatchObject([
      {
        extensions: { code: 'UNAUTHORISED' },
        message: `No access (reason: "Missing permission for performing 'alert:modify' on resource")`,
        path: ['disableAlertChannel'],
      },
    ]);
    expect((await readChannel(selector, liveId, ownerToken))?.disabledAt).toBeNull();

    const disabled = await disableChannel(deadId, ownerToken);
    expect(disabled.ok?.disabledAlertChannel).toEqual({
      id: deadId,
      disabledAt: expect.any(String),
      disabledBy: { id: expect.any(String) },
    });
    expect(await readChannel(selector, deadId, ownerToken)).toEqual(
      expect.objectContaining({
        disabledAt: expect.any(String),
        disabledBy: { displayName: expect.any(String) },
      }),
    );
    const twice = await disableChannel(deadId, ownerToken);
    expect(twice.error?.message).toBe('Alert channel not found or already disabled.');

    // Schema changes only; the creation confirmation each endpoint received carries another event.
    const schemaChangesAt = async (endpoint: { path: string }) =>
      (await getRecordedRequests()).filter(
        request =>
          request.path === endpoint.path &&
          Object.entries(request.headers).some(
            ([name, values]) =>
              name.toLowerCase() === 'hive-event' && values[0] === 'schema_change',
          ),
      ).length;

    await publish(/* GraphQL */ `
      type Query {
        ping: String
        pong: String
      }
    `);
    await asyncRetry(
      async () => {
        expect(await schemaChangesAt(live)).toBe(1);
      },
      { retries: 10, maxTimeout: 2000 },
    );
    expect(await schemaChangesAt(dead)).toBe(0);

    const enabled = await enableChannel(deadId, ownerToken);
    expect(enabled.ok?.enabledAlertChannel).toEqual({ id: deadId, disabledAt: null });
    expect((await readChannel(selector, deadId, ownerToken))?.disabledBy).toBeNull();

    await publish(/* GraphQL */ `
      type Query {
        ping: String
        pong: String
        pang: String
      }
    `);
    await asyncRetry(
      async () => {
        expect(await schemaChangesAt(dead)).toBe(1);
      },
      { retries: 10, maxTimeout: 2000 },
    );
    expect(await schemaChangesAt(live)).toBe(2);
    expect(liveId).not.toBe(deadId);

    // Enabling an active channel, or one the project does not have, is refused.
    const again = await enableChannel(deadId, ownerToken);
    expect(again.error?.message).toBe('Alert channel not found or already enabled.');
    const unknown = await enableChannel('00000000-0000-0000-0000-000000000000', ownerToken);
    expect(unknown.error?.message).toBe('Alert channel not found or already enabled.');
  },
);

test.concurrent(
  'a channel that has been failing for 48 hours is disabled by the hourly sweep',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { createProject, organization } = await createOrg();
    const { project, addAlertChannel } = await createProject(ProjectType.Single);
    const selector = { organizationSlug: organization.slug, projectSlug: project.slug };

    // Webhook channels: creating one sends no confirmation, so the rows inserted below are the
    // channel's whole history.
    const createWebhookChannel = async (name: string) => {
      const endpoint = await generateMockEndpoint();
      const created = await addAlertChannel({
        ...selector,
        name,
        type: AlertChannelType.Webhook,
        webhook: { endpoint: endpoint.url },
      });
      if (!created.ok) {
        throw new Error(created.error?.message ?? 'Expected ok');
      }
      return created.ok.addedAlertChannel.id;
    };
    const liveId = await createWebhookChannel('live');
    const deadId = await createWebhookChannel('dead');

    // Ten failures, the oldest 49 hours ago, all after the channel was enabled three days ago:
    // FAILING for longer than the 48 hours the page announces.
    await clickHouseInsert(`
      INSERT INTO "outbound_deliveries" (
        "timestamp", "organization_id", "delivery_type", "destination", "event", "attempt",
        "max_attempts", "ok", "status_code", "status_text", "duration_ms", "metadata"
      )
      SELECT
        now() - toIntervalHour(49) + toIntervalMinute(number), '${organization.id}', 'WEBHOOK',
        '${deadId}', 'schema_change', 1, 1, 0, 404, 'Not Found', 5,
        map('Hive-Event', 'schema_change')
      FROM numbers(10)
    `);
    await using db = await seed.createDbConnection();
    await db.pool.query(psql`
      UPDATE "alert_channels" SET "enabled_at" = now() - interval '3 days' WHERE "id" = ${deadId}
    `);
    expect((await readChannel(selector, deadId, ownerToken))?.deliveryHealth).toEqual({
      status: 'FAILING',
      failingSince: expect.any(String),
    });

    // The sweep runs once an hour; enqueue it now instead of waiting for the next tick.
    await new TaskScheduler(db.pool, new NoopLogger() as any).scheduleTask(
      DisableFailingAlertChannelsTask,
      undefined,
    );
    await pollFor(
      async () => (await readChannel(selector, deadId, ownerToken))?.disabledAt != null,
    );
    expect((await readChannel(selector, deadId, ownerToken))?.disabledBy).toBeNull();
    expect((await readChannel(selector, liveId, ownerToken))?.disabledAt).toBeNull();
  },
);
