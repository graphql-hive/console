import { expect, type APIRequestContext, type Page } from '@playwright/test';

export type UsageHelper = {
  createRegistryAccessToken(params: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  }): Promise<string>;
  sendUsageReport(params: { token: string; report: unknown }): Promise<void>;
  expectInsightOperation(operationName: string): Promise<void>;
  expectInsightVersion(version: string): Promise<void>;
};

export function createUsageHelper(
  page: Page,
  request: APIRequestContext,
  baseURL: unknown,
): UsageHelper {
  const isLocal =
    process.env.RUN_AGAINST_LOCAL_SERVICES === '1' ||
    (typeof baseURL === 'string' && baseURL.startsWith('http://localhost:3000'));
  const usageEndpoint = isLocal ? 'http://localhost:4001' : 'http://localhost:8081';

  async function reloadInsightsPage() {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#root > *').first().waitFor({ state: 'attached' });
  }

  return {
    async createRegistryAccessToken(params) {
      await page
        .locator(
          `a[href="/${params.organizationSlug}/${params.projectSlug}/${params.targetSlug}/settings"]`,
        )
        .click();
      await page.locator('[data-cy="target-settings-registry-token-link"]').click();
      await page
        .locator('[data-cy="target-settings-registry-token"] [data-cy="new-button"]')
        .click();
      await page
        .locator('[data-cy="create-registry-token-form"] [data-cy="description"]')
        .fill('test-token');
      await page.locator('[data-cy="registry-access-scope"] [data-cy="select-trigger"]').click();
      await page
        .locator(
          '[data-cy="registry-access-scope-select-content"] [data-cy="select-option-REGISTRY_WRITE"]',
        )
        .click();
      await page.locator('[data-cy="create-registry-token-form"] [data-cy="submit"]').click();

      const token = await page
        .locator('[data-cy="registry-token-created"] input[type="text"]')
        .inputValue();
      expect(token).toHaveLength(32);
      await page
        .locator('[data-cy="registry-token-created"] [data-cy="close"]')
        .getByText('Ok, got it!')
        .click();

      return token;
    },
    async sendUsageReport(params) {
      let responseStatus = 0;

      for (let attempt = 0; attempt < 20; attempt++) {
        const response = await request.post(usageEndpoint, {
          data: params.report,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${params.token}`,
            'Content-Type': 'application/json',
          },
        });
        responseStatus = response.status();

        if (responseStatus === 200) {
          return;
        }

        await page.waitForTimeout(1_000);
      }

      expect(responseStatus).toBe(200);
    },
    async expectInsightOperation(operationName) {
      await expect
        .poll(
          async () => {
            await reloadInsightsPage();

            return page.getByRole('link').filter({ hasText: operationName }).count();
          },
          { timeout: 30_000, intervals: [2_000] },
        )
        .toBeGreaterThan(0);
    },
    async expectInsightVersion(version) {
      await expect
        .poll(
          async () => {
            await reloadInsightsPage();

            return page.getByText(version, { exact: true }).count();
          },
          { timeout: 30_000, intervals: [2_000] },
        )
        .toBeGreaterThan(0);
    },
  };
}
