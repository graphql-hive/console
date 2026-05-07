import { expect, test } from '../fixtures';

test.beforeEach(async ({ seed, auth, laboratory }) => {
  const { slug, refreshToken } = await seed.seedTarget();
  await auth.useRefreshToken(refreshToken);
  await laboratory.openSeededTarget(slug);
});

test.describe('Laboratory > Tabs', () => {
  test('deleting the last tab should reset its state to defaults', async ({ laboratory }) => {
    const op1 = 'query { tab1 }';
    const op2 = 'query { tab2 }';

    await laboratory.closeTabsUntilOneLeft();
    await laboratory.updateEditorValue(op1);
    await expect.poll(() => laboratory.getEditorValue()).toBe(op1);

    await laboratory.openNewTab();
    await laboratory.updateEditorValue(op2);
    await expect.poll(() => laboratory.getEditorValue()).toBe(op2);

    await laboratory.closeActiveTab();
    await expect.poll(() => laboratory.getEditorValue()).toBe(op1);
    await laboratory.closeActiveTab();
    await expect.poll(() => laboratory.getEditorValue()).not.toBe(op1);
  });
});
