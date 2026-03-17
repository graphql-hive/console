import 'reflect-metadata';
import asyncRetry from 'async-retry';
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
