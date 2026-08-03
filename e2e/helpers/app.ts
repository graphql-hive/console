import { expect, type Page } from '@playwright/test';
import type { AuthHelper } from './auth';
import type { TestUser } from './data';

export type AppHelper = {
  createUserAndOrganization(user: TestUser, organizationSlug: string): Promise<void>;
  createOrganization(organizationSlug: string): Promise<void>;
  createProject(projectSlug: string): Promise<void>;
  waitForOrganizationPage(organizationSlug: string): Promise<void>;
  waitForProjectPage(projectSlug: string): Promise<void>;
  waitForTargetPage(targetSlug: string): Promise<void>;
};

export function createAppHelper(page: Page, auth: AuthHelper): AppHelper {
  return {
    async createUserAndOrganization(user, organizationSlug) {
      await page.goto('/');
      await auth.signup(user);
      await this.createOrganization(organizationSlug);
    },
    async createOrganization(organizationSlug) {
      await page.locator('input[name="slug"]').fill(organizationSlug);
      await page.locator('button[type="submit"]').click();
      await this.waitForOrganizationPage(organizationSlug);
    },
    async createProject(projectSlug) {
      await page.locator('[data-cy="new-project-button"]').click();
      await page.locator('form[data-cy="create-project-form"] [data-cy="slug"]').fill(projectSlug);
      await page.locator('form[data-cy="create-project-form"] [data-cy="submit"]').click();
      await this.waitForProjectPage(projectSlug);
    },
    async waitForOrganizationPage(organizationSlug) {
      await expect(page.locator('[data-cy="organization-picker-current"]')).toContainText(
        organizationSlug,
      );
    },
    async waitForProjectPage(projectSlug) {
      await expect(page.locator('[data-cy="project-picker-current"]')).toContainText(projectSlug);
    },
    async waitForTargetPage(targetSlug) {
      await expect(page.locator('[data-cy="target-picker-current"]')).toContainText(targetSlug);
    },
  };
}
