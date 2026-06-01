import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

async function createCollection(page: Page, args: { name: string; description: string }) {
  await page.locator('button[data-cy="new-collection"]').click();
  await page.locator('div[data-cy="create-collection-modal"] input[name="name"]').fill(args.name);
  await page
    .locator('div[data-cy="create-collection-modal"] input[name="description"]')
    .fill(args.description);
  await page.locator('div[data-cy="create-collection-modal"] button[type="submit"]').click();
  await expect(page.locator('div[data-cy="create-collection-modal"]')).not.toBeVisible();
}

async function clickCollectionButton(page: Page, name: string) {
  await page.locator('button[data-cy="collection-item-trigger"]').getByText(name).click();
}

async function saveCurrentOperationAs(page: Page, args: { name: string; collectionName: string }) {
  await page.locator('[data-cy="save-operation"]').click();
  await page.locator('[data-cy="save-operation-as"]').click();
  await page.locator('div[data-cy="create-operation-modal"] input[name="name"]').fill(args.name);
  await page
    .locator('div[data-cy="create-operation-modal"] button[data-cy="collection-select-trigger"]')
    .click();
  await page
    .locator('div[data-cy="collection-select-item"]')
    .getByText(args.collectionName)
    .click();
  await page.locator('div[data-cy="create-operation-modal"] button[type="submit"]').click();
  await expect(page.locator('div[data-cy="create-operation-modal"]')).not.toBeVisible();
}

async function openOperationMenu(page: Page, name: string) {
  await page.locator(`a[data-cy="operation-${name}"] ~ button`).click();
}

async function openCollectionMenu(page: Page, name: string) {
  await page
    .locator('[data-cy="collection-item"]')
    .filter({ hasText: name })
    .locator('[data-cy="collection-menu-trigger"]')
    .click();
}

function operationButton(page: Page, name: string) {
  return page.locator(`a[data-cy="operation-${name}"]`);
}

function collectionButton(page: Page, name: string) {
  return page.locator('[data-cy="collection-item"]').filter({ hasText: name });
}

test.beforeEach(async ({ seed, auth, laboratory }) => {
  const { accessToken, slug, refreshToken } = await seed.seedTarget();
  await auth.useSession({ refreshToken, accessToken });
  await laboratory.openSeededTarget(slug);
  await laboratory.openCollectionsPanel();
});

test.describe('Laboratory > Collections', () => {
  test('create a collection and an operation', async ({ page, laboratory }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });
    await expect(operationButton(page, 'operation-1')).toBeVisible();
  });

  test("edit collection's name", async ({ page, laboratory }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    await openCollectionMenu(page, 'collection-1');
    await page.locator('[data-cy="edit-collection"]').click();
    await expect(page.locator('[data-cy="create-collection-modal"]')).toBeVisible();
    const collectionNameInput = page.locator(
      '[data-cy="create-collection-modal"] input[name="name"]',
    );
    await expect(collectionNameInput).toHaveValue('collection-1');
    await collectionNameInput.fill('collection-1-updated');
    await page.locator('[data-cy="create-collection-modal"] button[data-cy="confirm"]').click();
    await expect(page.locator('[data-cy="create-collection-modal"]')).not.toBeVisible();

    await expect(collectionButton(page, 'collection-1-updated')).toBeVisible();
    await expect(operationButton(page, 'operation-1')).toBeVisible();
  });

  test('delete a collection', async ({ page, laboratory }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    await expect(operationButton(page, 'operation-1')).toBeVisible();
    await expect(collectionButton(page, 'collection-1')).toBeVisible();

    await openCollectionMenu(page, 'collection-1');
    await page.locator('[data-cy="delete-collection"]').click();
    await expect(page.locator('[data-cy="delete-collection-modal"]')).toBeVisible();
    await page.locator('[data-cy="delete-collection-modal"] button[data-cy="confirm"]').click();

    await expect(operationButton(page, 'operation-1')).not.toBeVisible();
    await expect(collectionButton(page, 'collection-1')).not.toBeVisible();
  });

  test("edit operation's name", async ({ page, laboratory }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    await openOperationMenu(page, 'operation-1');
    await page.locator('[data-cy="edit-operation"]').click();
    await expect(page.locator('[data-cy="edit-operation-modal"]')).toBeVisible();
    await page
      .locator('[data-cy="edit-operation-modal"] input[name="name"]')
      .fill('operation-1-updated');
    await page.locator('[data-cy="edit-operation-modal"] button[data-cy="confirm"]').click();

    await expect(operationButton(page, 'operation-1')).not.toBeVisible();
    await expect(operationButton(page, 'operation-1-updated')).toBeVisible();
  });

  test('delete an operation', async ({ page, laboratory }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    await laboratory.openNewTab();
    await laboratory.updateEditorValue('query op2 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-2',
      collectionName: 'collection-1',
    });

    await openOperationMenu(page, 'operation-1');
    await page.locator('[data-cy="delete-operation"]').click();
    await expect(page.locator('[data-cy="delete-operation-modal"]')).toBeVisible();
    await page.locator('[data-cy="delete-operation-modal"] button[data-cy="confirm"]').click();

    await expect(operationButton(page, 'operation-1')).not.toBeVisible();
    await expect(operationButton(page, 'operation-2')).toBeVisible();
  });

  test('visiting a copied operation link should open the operation', async ({
    page,
    laboratory,
  }) => {
    await createCollection(page, {
      name: 'collection-1',
      description: 'Description 1',
    });
    await createCollection(page, {
      name: 'collection-2',
      description: 'Description 2',
    });
    await clickCollectionButton(page, 'collection-1');
    await laboratory.updateEditorValue('query op1 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-1',
      collectionName: 'collection-1',
    });

    await laboratory.openNewTab();
    await laboratory.updateEditorValue('query op2 { test }');
    await saveCurrentOperationAs(page, {
      name: 'operation-2',
      collectionName: 'collection-2',
    });

    const copiedUrl = await operationButton(page, 'operation-1').evaluate(
      operation => (operation as HTMLAnchorElement).href,
    );

    await page.goto(copiedUrl);
    await laboratory.assertActiveTab('operation-1');
    await expect.poll(() => laboratory.getEditorValue()).toContain('op1');
  });
});
