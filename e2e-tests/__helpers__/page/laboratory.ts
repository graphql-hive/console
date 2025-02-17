import { expect, Locator } from '@playwright/test';
import { enhancePageWithHelpers, HelpersConstructor } from '../playwright';

export interface LaboratoryHelpers {
  graphiql: {
    documentEditor: Locator;
    documentEditorFill: (text: string) => Promise<void>;
    buttonNewTab: Locator;
    buttonCloseTab: Locator;
  };
}

export const createLaboratoryHelpers: HelpersConstructor<LaboratoryHelpers> = page => {
  const documentEditor = page.getByRole('region', { name: 'Query Editor' });
  const buttonNewTab = page.getByRole('button', { name: 'New tab' });
  const buttonCloseTab = page.getByRole('button', { name: 'Close Tab' });

  return {
    graphiql: {
      documentEditorFill: async (text: string) => {
        await documentEditor.click();
        await page.keyboard.press('ControlOrMeta+KeyA');
        await page.keyboard.type(text);
        await expect(documentEditor).toContainText(text); // sanity check content changed
      },
      documentEditor,
      buttonNewTab,
      buttonCloseTab,
    },
  };
};

export const enhancePageWithLaboratoryHelpers = enhancePageWithHelpers(createLaboratoryHelpers);
