import type { Page } from '@playwright/test';
import { test } from '../fixtures';
import type { AppHelper } from '../helpers/app';
import { generateRandomSlug, getUserData } from '../helpers/data';
import type { UsageHelper } from '../helpers/usage';

// Each test waits on ClickHouse ingestion through several stacked polls (see helpers/usage.ts).
// Keep the timeout above the sum of those poll budgets so a slow-but-succeeding poll isn't cut
// off mid-wait by the per-test deadline.
test.describe.configure({ mode: 'serial', timeout: 120_000 });

type UsageReport = {
  size: number;
  map: Record<
    string,
    {
      operation: string;
      operationName: string;
      fields: string[];
    }
  >;
  operations: Array<{
    operationMapKey: string;
    timestamp: number;
    execution: {
      ok: boolean;
      duration: number;
      errorsTotal: number;
    };
    metadata: {
      client: {
        name?: string;
        version: string;
      };
    };
  }>;
};

function usageReport(client: { name?: string; version: string }): UsageReport {
  return {
    size: 1,
    map: {
      op1: {
        operation: 'query ping { ping }',
        operationName: 'ping',
        fields: ['Query', 'Query.ping'],
      },
    },
    operations: [
      {
        operationMapKey: 'op1',
        timestamp: Date.now(),
        execution: {
          ok: true,
          duration: 200_000_000,
          errorsTotal: 0,
        },
        metadata: {
          client,
        },
      },
    ],
  };
}

async function createTargetAndToken(page: Page, app: AppHelper, usage: UsageHelper) {
  const organizationSlug = generateRandomSlug();
  const projectSlug = generateRandomSlug();
  const targetSlug = 'development';

  await app.createUserAndOrganization(getUserData(), organizationSlug);
  await app.createProject(projectSlug);
  await page.locator(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
  await app.waitForTargetPage(targetSlug);

  const token = await usage.createRegistryAccessToken({
    organizationSlug,
    projectSlug,
    targetSlug,
  });

  return {
    organizationSlug,
    projectSlug,
    targetSlug,
    token,
  };
}

test.describe('usage reporting', () => {
  test('usage report should be visible in Insights', async ({ page, app, usage }) => {
    const target = await createTargetAndToken(page, app, usage);

    await usage.sendUsageReport({
      token: target.token,
      report: usageReport({ name: 'ios', version: 'v1.2.3' }),
    });

    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights`,
    );
    await usage.expectInsightOperation('_ping');
    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights/client/ios`,
    );
    await usage.expectInsightOperation('_ping');
    await usage.expectInsightVersion('v1.2.3');
  });

  test('usage report with "unknown" client should be visible in Insights', async ({
    page,
    app,
    usage,
  }) => {
    const target = await createTargetAndToken(page, app, usage);

    await usage.sendUsageReport({
      token: target.token,
      report: usageReport({ name: 'unknown', version: 'v1.2.3' }),
    });

    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights`,
    );
    await usage.expectInsightOperation('_ping');
    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights/client/unknown`,
    );
    await usage.expectInsightOperation('_ping');
    await usage.expectInsightVersion('v1.2.3');
  });

  test('usage report with missing client name should be visible in Insights', async ({
    page,
    app,
    usage,
  }) => {
    const target = await createTargetAndToken(page, app, usage);

    await usage.sendUsageReport({
      token: target.token,
      report: usageReport({ name: undefined, version: 'v1.2.3' }),
    });

    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights`,
    );
    await usage.expectInsightOperation('_ping');
    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights/client/unknown`,
    );
    await usage.expectInsightOperation('_ping');
    await usage.expectInsightVersion('v1.2.3');
  });

  test('usage report with missing and "unknown" client names should be visible in Insights', async ({
    page,
    app,
    usage,
  }) => {
    const target = await createTargetAndToken(page, app, usage);

    await usage.sendUsageReport({
      token: target.token,
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
          op2: {
            operation: 'query pong { pong }',
            operationName: 'pong',
            fields: ['Query', 'Query.pong'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: undefined,
                version: 'vUndefined',
              },
            },
          },
          {
            operationMapKey: 'op2',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'unknown',
                version: 'vUnknown',
              },
            },
          },
        ],
      },
    });

    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights`,
    );
    await usage.expectInsightOperation('_ping');
    await usage.expectInsightOperation('_pong');
    await page.goto(
      `/${target.organizationSlug}/${target.projectSlug}/${target.targetSlug}/insights/client/unknown`,
    );
    await usage.expectInsightOperation('_ping');
    await usage.expectInsightOperation('_pong');
    await usage.expectInsightVersion('vUndefined');
    await usage.expectInsightVersion('vUnknown');
  });
});
