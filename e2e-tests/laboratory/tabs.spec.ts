import { expect, Page, test as testBase } from '@playwright/test';
import {
  enhancePageWithLaboratoryHelpers,
  LaboratoryHelpers,
} from '../__helpers__/page/laboratory';
import { initSeed } from '../../integration-tests/testkit/seed';

interface Context {
  page: Page & LaboratoryHelpers;
}

const test = testBase.extend<Context>({
  page: async ({ page }, use) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const project = await org.createProject();

    await page.context().addCookies([
      {
        name: 'sRefreshToken',
        value: owner.ownerRefreshToken,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto(`${project.target.path}/laboratory`);
    await use(enhancePageWithLaboratoryHelpers(page));
  },
});

test('closing the last tab should reset its state to defaults', async ({ page }) => {
  const { documentEditor, buttonNewTab, buttonCloseTab, documentEditorFill } = page.graphiql;

  const content = {
    partialDefault: '# Welcome to GraphiQL',
    document1: 'query { tab1 }',
    document2: 'query { tab2 }',
  };

  // Begins with default content
  await expect(documentEditor).toContainText(content.partialDefault);
  // Change content
  await documentEditorFill(content.document1);
  // Open a new tab
  await buttonNewTab.click();
  await documentEditorFill(content.document2);
  // close tab 2
  await buttonCloseTab.click();
  await expect(documentEditor).toContainText(content.document1); // sanity check tab 1 content unchanged
  // close tab 1
  await buttonCloseTab.click();
  // expect a new tab created with default content
  await expect(documentEditor).toContainText(content.partialDefault);
});
