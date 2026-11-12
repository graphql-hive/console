import { expect, test, vi } from 'vitest';
import type { AlertChannel } from '../../../shared/entities';
import { AlertChannelDestinationError, AlertsManager } from './alerts-manager';

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn() }) };
const selector = { organizationId: 'org-1', projectId: 'project-1' };
const existing: AlertChannel = {
  id: 'channel-1',
  projectId: 'project-1',
  type: 'SLACK',
  name: 'slack',
  createdAt: '2026-01-01T00:00:00.000Z',
  slackChannel: '#old',
  webhookEndpoint: null,
};

function createManager({ slackToken }: { slackToken: string | null }) {
  const storage = {
    addAlertChannel: vi.fn(async (input: Partial<AlertChannel>) => ({
      ...existing,
      ...input,
      id: 'channel-2',
    })),
    getAlertChannels: vi.fn(async () => [existing]),
    updateAlertChannel: vi.fn(
      async (input: { name: string | null; slackChannel: string | null }) => ({
        ...existing,
        name: input.name ?? existing.name,
        slackChannel: input.slackChannel ?? existing.slackChannel,
      }),
    ),
  };
  const slack = { sendChannelConfirmation: vi.fn(async () => {}) };
  const manager = new AlertsManager(
    logger as any,
    { assertPerformAction: vi.fn(async () => {}) } as any,
    { getToken: vi.fn(async () => slackToken) } as any,
    slack as any,
    {} as any,
    {} as any,
    {} as any,
    { getOrganization: vi.fn(async () => ({ id: 'org-1', slug: 'org', name: 'Org' })) } as any,
    {
      getProject: vi.fn(async () => ({ id: 'project-1', slug: 'project', name: 'Project' })),
    } as any,
    storage as any,
    {} as any,
  );
  return { manager, storage, slack };
}

test('adding a Slack channel without the Slack integration writes nothing', async () => {
  const { manager, storage } = createManager({ slackToken: null });
  const attempt = manager.addChannel({
    ...selector,
    name: 'slack',
    type: 'SLACK',
    slackChannel: '#alerts',
  });
  await expect(attempt).rejects.toBeInstanceOf(AlertChannelDestinationError);
  await expect(attempt).rejects.toMatchObject({ field: 'slackChannel' });
  expect(storage.addAlertChannel).not.toHaveBeenCalled();
});

test('moving a Slack channel without the Slack integration writes nothing', async () => {
  const { manager, storage } = createManager({ slackToken: null });
  const attempt = manager.updateChannel({
    ...selector,
    channelId: existing.id,
    name: null,
    slackChannel: '#new',
    webhookEndpoint: null,
  });
  await expect(attempt).rejects.toBeInstanceOf(AlertChannelDestinationError);
  await expect(attempt).rejects.toMatchObject({ field: 'slackChannel' });
  expect(storage.updateAlertChannel).not.toHaveBeenCalled();
});

test('renaming a Slack channel needs no Slack integration and sends nothing', async () => {
  const { manager, slack } = createManager({ slackToken: null });
  await expect(
    manager.updateChannel({
      ...selector,
      channelId: existing.id,
      name: 'renamed',
      slackChannel: null,
      webhookEndpoint: null,
    }),
  ).resolves.toMatchObject({ id: existing.id, name: 'renamed', slackChannel: '#old' });
  expect(slack.sendChannelConfirmation).not.toHaveBeenCalled();
});

test('with the Slack integration a new Slack destination is written and confirmed', async () => {
  const { manager, slack } = createManager({ slackToken: 'xoxb-token' });
  await expect(
    manager.addChannel({ ...selector, name: 'slack', type: 'SLACK', slackChannel: '#alerts' }),
  ).resolves.toMatchObject({ id: 'channel-2', slackChannel: '#alerts' });
  await expect(
    manager.updateChannel({
      ...selector,
      channelId: existing.id,
      name: null,
      slackChannel: '#new',
      webhookEndpoint: null,
    }),
  ).resolves.toMatchObject({ id: existing.id, slackChannel: '#new' });
  expect(slack.sendChannelConfirmation).toHaveBeenCalledTimes(2);
});
