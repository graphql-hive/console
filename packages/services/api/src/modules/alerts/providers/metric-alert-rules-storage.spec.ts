import { vi } from 'vitest';
import { MetricAlertRulesStorage } from './metric-alert-rules-storage';

const VALID_ID = '3f2a9c1e-8b4d-4e2f-9a6b-1c2d3e4f5a6b';

function createStorage() {
  const pool = {
    maybeOne: vi.fn().mockResolvedValue(null),
    any: vi.fn().mockResolvedValue([]),
    anyFirst: vi.fn().mockResolvedValue([]),
  };
  return { storage: new MetricAlertRulesStorage(pool as any), pool };
}

describe('MetricAlertRulesStorage malformed ids', () => {
  test('getMetricAlertRule returns null without querying', async () => {
    const { storage, pool } = createStorage();
    await expect(storage.getMetricAlertRule({ id: 'not-a-uuid' })).resolves.toBeNull();
    expect(pool.maybeOne).not.toHaveBeenCalled();
  });

  test('getSavedFilterScope returns null without querying', async () => {
    const { storage, pool } = createStorage();
    await expect(storage.getSavedFilterScope('')).resolves.toBeNull();
    await expect(storage.getSavedFilterScope('not-a-uuid')).resolves.toBeNull();
    expect(pool.maybeOne).not.toHaveBeenCalled();
  });

  test('getChannelProjectIds drops malformed ids so callers see them as missing', async () => {
    const { storage, pool } = createStorage();
    await expect(storage.getChannelProjectIds(['not-a-uuid'])).resolves.toEqual([]);
    expect(pool.anyFirst).not.toHaveBeenCalled();

    await storage.getChannelProjectIds(['not-a-uuid', VALID_ID]);
    expect(pool.anyFirst).toHaveBeenCalledTimes(1);
  });

  test('deleteMetricAlertRules skips the query when no id is a valid uuid', async () => {
    const { storage, pool } = createStorage();
    await expect(
      storage.deleteMetricAlertRules({ projectId: VALID_ID, ruleIds: ['not-a-uuid'] }),
    ).resolves.toEqual([]);
    expect(pool.any).not.toHaveBeenCalled();

    await storage.deleteMetricAlertRules({
      projectId: VALID_ID,
      ruleIds: ['not-a-uuid', VALID_ID],
    });
    expect(pool.any).toHaveBeenCalledTimes(1);
  });

  test('valid ids still reach the database', async () => {
    const { storage, pool } = createStorage();
    await storage.getMetricAlertRule({ id: VALID_ID });
    await storage.getSavedFilterScope(VALID_ID);
    expect(pool.maybeOne).toHaveBeenCalledTimes(2);
  });
});
