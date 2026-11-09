import { SchemaChangeNotification } from './schema-change-notification.js';

const payload = {
  endpoint: 'https://hooks.example.com/hive',
  event: {
    organization: { id: 'o1', cleanId: 'org', slug: 'org', name: 'Org' },
    project: { id: 'p1', cleanId: 'project', slug: 'project', name: 'Project' },
    target: { id: 't1', cleanId: 'target', slug: 'target', name: 'Target' },
    schema: { id: 'v1', valid: true, commit: 'abc' },
    changes: [],
    errors: [],
  },
};

describe('SchemaChangeNotification payload', () => {
  // Jobs enqueued before the channel id was added are still in the queue after a deploy.
  test('parses a payload without a channel id', () => {
    expect(SchemaChangeNotification.parse(payload)).not.toHaveProperty('channelId');
  });

  test('keeps the channel id when present', () => {
    expect(SchemaChangeNotification.parse({ ...payload, channelId: 'c1' }).channelId).toBe('c1');
  });
});
