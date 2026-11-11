import type { Storage } from '@hive/api';
import type { TaskScheduler } from '@hive/workflows/kit';
import { captureException } from '@sentry/node';
import type { UsageEstimator } from '../usage-estimator/estimator';
import { createRateLimiter, type RateLimiter } from './limiter';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
// `./emails` loads `../environment`, which exits the process without the service's env vars.
vi.mock('./emails', () => ({
  createEmailScheduler: () => ({
    drain: () => [],
    limitExceeded: vi.fn(),
    limitWarning: vi.fn(),
  }),
}));

type LimitInfoRecord = Awaited<
  ReturnType<Storage['getGetOrganizationsAndTargetsWithLimitInfo']>
>[number];

const knownOrg: LimitInfoRecord = {
  organization: 'org-1',
  org_name: 'Org 1',
  org_clean_id: 'org-1',
  org_plan_name: 'HOBBY',
  owner_email: 'owner@example.com',
  targets: ['target-known'],
  limit_operations_monthly: 1000,
  limit_retention_days: 30,
};

const unknownRateLimit = { current: -1, quota: -1, usagePercentage: 0, limited: false };

function buildLogger() {
  const logger: any = {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };
  logger.child = vi.fn(() => logger);
  return logger;
}

let activeLimiter: RateLimiter | null = null;

async function startLimiter(lookup: (targetId: string) => Promise<LimitInfoRecord | null>) {
  const logger = buildLogger();
  const lookupSpy = vi.fn(({ targetId }: { targetId: string }) => lookup(targetId));
  const storage = {
    getGetOrganizationsAndTargetsWithLimitInfo: vi.fn(async () => [knownOrg]),
    getOrganizationWithLimitInfoByTargetId: lookupSpy,
  };
  const usageEstimator = {
    estimateCollectedOperationsForAllOrganizations: vi.fn(async () => ({ 'org-1': 10 })),
  };
  const limiter = createRateLimiter({
    logger,
    rateLimitConfig: { interval: 60_000 },
    taskScheduler: {} as TaskScheduler,
    usageEstimator: usageEstimator as unknown as UsageEstimator,
    storage: storage as unknown as Storage,
  });
  activeLimiter = limiter;
  await limiter.start();

  return { limiter, logger, lookup: lookupSpy };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(captureException).mockClear();
});

afterEach(async () => {
  await activeLimiter?.stop();
  activeLimiter = null;
  vi.useRealTimers();
});

describe('rate limiter target lookup', () => {
  test('resolves a target created after the snapshot and keeps the organization usage', async () => {
    const { limiter, logger, lookup } = await startLimiter(async () => ({
      ...knownOrg,
      targets: ['target-known', 'target-new'],
    }));

    const orgLimits = await limiter.checkLimit({ entityType: 'organization', id: 'org-1' });
    expect(orgLimits).toMatchObject({ current: 10, quota: 1000, limited: false });

    await expect(limiter.checkLimit({ entityType: 'target', id: 'target-new' })).resolves.toBe(
      orgLimits,
    );
    await expect(limiter.getRetention('target-new')).resolves.toBe(30);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(captureException).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('seeds an organization that is missing from the snapshot', async () => {
    const { limiter } = await startLimiter(async () => ({
      ...knownOrg,
      organization: 'org-2',
      org_clean_id: 'org-2',
      org_name: 'Org 2',
      targets: ['target-brand-new'],
      limit_operations_monthly: 500,
      limit_retention_days: 7,
    }));

    await expect(
      limiter.checkLimit({ entityType: 'target', id: 'target-brand-new' }),
    ).resolves.toEqual({ current: 0, quota: 500, limited: false, usagePercentage: 0 });
    await expect(limiter.getRetention('target-brand-new')).resolves.toBe(7);
  });

  test('falls back for a missing target without reporting an error, until the next refresh', async () => {
    const { limiter, logger, lookup } = await startLimiter(async () => null);

    await expect(limiter.checkLimit({ entityType: 'target', id: 'target-gone' })).resolves.toEqual(
      unknownRateLimit,
    );
    await expect(limiter.getRetention('target-gone')).resolves.toBe(365);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);

    await expect(limiter.checkLimit({ entityType: 'target', id: 'target-gone' })).resolves.toEqual(
      unknownRateLimit,
    );
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  test('shares one storage lookup between concurrent calls for the same target', async () => {
    let resolveLookup!: (record: LimitInfoRecord | null) => void;
    const { limiter, lookup } = await startLimiter(
      () =>
        new Promise(resolve => {
          resolveLookup = resolve;
        }),
    );

    const pending = Promise.all([
      limiter.checkLimit({ entityType: 'target', id: 'target-new' }),
      limiter.getRetention('target-new'),
    ]);
    resolveLookup({ ...knownOrg, targets: ['target-known', 'target-new'] });

    await expect(pending).resolves.toEqual([expect.objectContaining({ quota: 1000 }), 30]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  test('reports a failing storage lookup and retries it on the next call', async () => {
    const error = new Error('connection refused');
    const { limiter, lookup } = await startLimiter(async () => {
      throw error;
    });

    await expect(limiter.checkLimit({ entityType: 'target', id: 'target-new' })).resolves.toEqual(
      unknownRateLimit,
    );
    expect(captureException).toHaveBeenCalledWith(error, { level: 'error' });

    await expect(limiter.getRetention('target-new')).resolves.toBe(365);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  test('does not look up organizations in storage', async () => {
    const { limiter, lookup } = await startLimiter(async () => null);

    await expect(
      limiter.checkLimit({ entityType: 'organization', id: 'org-1' }),
    ).resolves.toMatchObject({ current: 10, quota: 1000, limited: false });
    await expect(
      limiter.checkLimit({ entityType: 'organization', id: 'org-missing' }),
    ).resolves.toEqual(unknownRateLimit);
    expect(lookup).not.toHaveBeenCalled();
  });
});
