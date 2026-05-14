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

export function createUsageHelper(page: Page, request: APIRequestContext): UsageHelper {
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
      const response = await request.post('http://localhost:8081', {
        data: params.report,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status()).toBe(200);
    },
    async expectInsightOperation(operationName) {
      await expect(
        page.locator('h3').filter({ hasText: 'Operations' }).locator('..').locator('a'),
      ).toContainText(operationName);
    },
    async expectInsightVersion(version) {
      await expect(
        page.locator('h3').filter({ hasText: 'Versions' }).locator('..').locator('p'),
      ).toContainText(version);
    },
  };
}
