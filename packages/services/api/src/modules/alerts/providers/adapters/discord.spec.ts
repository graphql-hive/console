import { AlertChannel } from 'packages/services/api/src/shared/entities';
import { beforeEach, vi } from 'vitest';
import { SchemaChangeType } from '@hive/storage';
import { ChannelConfirmationInput, SchemaChangeNotificationInput } from './common';
import { DiscordCommunicationAdapter } from './discord';

const logger = {
  child: () => ({
    debug: vi.fn(),
    error: vi.fn(),
  }),
};

const appBaseUrl = 'app-base-url';
const webhookUrl = 'webhook-url';

function createAdapter() {
  const httpClient = {
    post: vi.fn().mockResolvedValue(undefined),
  };
  const adapter = new DiscordCommunicationAdapter(logger as any, httpClient as any, appBaseUrl);

  return { adapter, httpClient };
}

describe('DiscordCommunicationAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendSchemaChangeNotification', () => {
    it('should send schema change notification as Discord embed', async () => {
      const changes = [
        {
          id: 'id-1',
          type: 'FIELD_REMOVED',
          approvalMetadata: null,
          criticality: 'BREAKING',
          message: "Field 'addFoo' was removed from object type 'Mutation'",
          meta: {
            typeName: 'Mutation',
            removedFieldName: 'addFoo',
            isRemovedFieldDeprecated: false,
            typeType: 'object type',
          },
          path: 'Mutation.addFoo',
          isSafeBasedOnUsage: false,
          reason:
            'Removing a field is a breaking change. It is preferable to deprecate the field before removing it.',
          usageStatistics: null,
          affectedAppDeployments: null,
          breakingChangeSchemaCoordinate: 'Mutation.addFoo',
        },
        {
          id: 'id-2',
          type: 'FIELD_ADDED',
          approvalMetadata: null,
          criticality: 'NON_BREAKING',
          message: "Field 'addFooT' was added to object type 'Mutation'",
          meta: {
            typeName: 'Mutation',
            addedFieldName: 'addFooT',
            typeType: 'object type',
          },
          path: 'Mutation.addFooT',
          isSafeBasedOnUsage: false,
          reason: null,
          usageStatistics: null,
          affectedAppDeployments: null,
          breakingChangeSchemaCoordinate: null,
        },
      ] as Array<SchemaChangeType>;

      const input = {
        alert: {
          id: 'alert-id',
          type: 'SCHEMA_CHANGE_NOTIFICATIONS',
          channelId: 'channel-id',
          projectId: 'project-id',
          organizationId: 'org-id',
          createdAt: new Date().toISOString(),
          targetId: 'target-id',
        },
        integrations: {
          slack: {
            token: null,
          },
        },
        event: {
          organization: {
            id: 'org-id',
            cleanId: 'org-clean-id',
            slug: 'org-clean-id',
            name: '',
          },
          project: {
            id: 'project-id',
            cleanId: 'project-clean-id',
            slug: 'project-clean-id',
            name: 'project-name',
          },
          target: {
            id: 'target-id',
            cleanId: 'target-clean-id',
            slug: 'target-clean-id',
            name: 'target-name',
          },
          changes,
          messages: [],
          initial: false,
          errors: [],
          schema: {
            id: 'schema-id',
            commit: 'commit',
            valid: true,
          },
        },
        channel: {
          webhookEndpoint: webhookUrl,
        } as AlertChannel,
      } as SchemaChangeNotificationInput;

      const { adapter } = createAdapter();
      const sendDiscordMessageSpy = vi.spyOn(adapter, 'sendDiscordMessage');

      await adapter.sendSchemaChangeNotification(input);

      expect(sendDiscordMessageSpy).toHaveBeenCalledWith(webhookUrl, {
        embeds: [
          expect.objectContaining({
            title: 'Breaking schema changes detected',
            url: 'app-base-url/org-clean-id/project-clean-id/target-clean-id/history/schema-id',
            color: 0xe74c3c,
            description: expect.stringContaining('### Breaking changes'),
            fields: [
              { name: 'Project', value: 'project-name', inline: true },
              { name: 'Target', value: 'target-name', inline: true },
              { name: 'Commit', value: 'commit', inline: true },
            ],
          }),
        ],
      });
      expect(sendDiscordMessageSpy.mock.calls[0]?.[1].embeds?.[0]?.description).toContain(
        'Field `addFoo` was removed from object type `Mutation`',
      );
      expect(sendDiscordMessageSpy.mock.calls[0]?.[1].embeds?.[0]?.description).toContain(
        '### Safe changes',
      );
    });

    it('should not send a notification without a webhook endpoint', async () => {
      const input = {
        event: {
          organization: { id: 'org-id' },
          project: { id: 'project-id' },
          target: { id: 'target-id' },
        },
        channel: {},
      } as SchemaChangeNotificationInput;
      const { adapter } = createAdapter();
      const sendDiscordMessageSpy = vi.spyOn(adapter, 'sendDiscordMessage');

      await adapter.sendSchemaChangeNotification(input);

      expect(sendDiscordMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendChannelConfirmation', () => {
    it('should send channel confirmation', async () => {
      const input = {
        event: {
          organization: {
            id: 'org-id',
            cleanId: 'org-clean-id',
            slug: 'org-clean-id',
          },
          project: {
            id: 'project-id',
            cleanId: 'project-clean-id',
            slug: 'project-clean-id',
            name: 'project-name',
          },
          kind: 'created',
        },
        channel: {
          webhookEndpoint: webhookUrl,
        },
      } as ChannelConfirmationInput;
      const { adapter } = createAdapter();
      const sendDiscordMessageSpy = vi.spyOn(adapter, 'sendDiscordMessage');

      await adapter.sendChannelConfirmation(input);

      expect(sendDiscordMessageSpy).toHaveBeenCalledWith(webhookUrl, {
        embeds: [
          {
            title: 'GraphQL Hive notifications',
            color: 0x5865f2,
            description:
              'I will send notifications here about your [project-name](app-base-url/org-clean-id/project-clean-id) project.',
          },
        ],
      });

      input.event.kind = 'deleted';
      await adapter.sendChannelConfirmation(input);

      expect(sendDiscordMessageSpy).toHaveBeenLastCalledWith(webhookUrl, {
        embeds: [
          {
            title: 'GraphQL Hive notifications',
            color: 0x5865f2,
            description:
              'I will no longer send notifications here about your [project-name](app-base-url/org-clean-id/project-clean-id) project.',
          },
        ],
      });
    });
  });

  describe('sendDiscordMessage', () => {
    it('sends a Discord webhook payload with embeds', async () => {
      const { adapter, httpClient } = createAdapter();

      await adapter.sendDiscordMessage('http://example.com/webhook', {
        embeds: [
          {
            title: 'Notification',
            description: 'Schema changed',
            color: 0x2ecc71,
          },
        ],
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        'http://example.com/webhook',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          json: {
            username: 'GraphQL Hive',
            embeds: [
              {
                title: 'Notification',
                description: 'Schema changed',
                color: 0x2ecc71,
              },
            ],
            allowed_mentions: { parse: [] },
          },
          context: {
            logger: expect.any(Object),
          },
        }),
      );
    });

    it('truncates embed fields to Discord limits', async () => {
      const { adapter, httpClient } = createAdapter();

      await adapter.sendDiscordMessage('http://example.com/webhook', {
        embeds: [
          {
            title: 'a'.repeat(300),
            description: 'b'.repeat(5000),
            fields: [
              {
                name: 'c'.repeat(300),
                value: 'd'.repeat(2000),
              },
            ],
          },
        ],
      });

      const body = httpClient.post.mock.calls[0][1].json;

      expect(body.embeds[0].title).toHaveLength(256);
      expect(body.embeds[0].description).toHaveLength(4096);
      expect(body.embeds[0].fields[0].name).toHaveLength(256);
      expect(body.embeds[0].fields[0].value).toHaveLength(1024);
    });

    it('handles failed send operation', async () => {
      const { adapter, httpClient } = createAdapter();
      httpClient.post.mockRejectedValueOnce(new Error('Failed to send Discord message: Bad Request'));

      await expect(
        adapter.sendDiscordMessage('http://example.com/webhook', {
          embeds: [{ title: 'Test message' }],
        }),
      ).rejects.toThrow('Failed to send Discord message: Bad Request');
    });
  });
});
