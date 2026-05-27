import { expect, type Page } from '@playwright/test';

export type LaboratoryHelper = {
  setGraphiQLMode(): Promise<void>;
  openSeededTarget(slug: string): Promise<void>;
  updateEditorValue(value: string): Promise<void>;
  getEditorValue(): Promise<string>;
  openNewTab(): Promise<void>;
  assertActiveTab(name: string): Promise<void>;
  closeActiveTab(): Promise<void>;
  closeTabsUntilOneLeft(): Promise<void>;
  setMonacoEditorContents(editorCyName: string, text: string): Promise<void>;
  openCollectionsPanel(): Promise<void>;
};

export function createLaboratoryHelper(page: Page): LaboratoryHelper {
  return {
    async setGraphiQLMode() {
      await page.addInitScript(() => {
        window.localStorage.setItem('hive:laboratory:type', 'graphiql');
      });
    },
    async openSeededTarget(slug) {
      await this.setGraphiQLMode();
      await page.goto(`/${slug}/laboratory`, { waitUntil: 'domcontentloaded' });
    },
    async updateEditorValue(value) {
      await page
        .locator('.graphiql-query-editor .cm-s-graphiql')
        .evaluate((editorElement, nextValue) => {
          const editor = (editorElement as any).CodeMirror;
          editor.setValue(nextValue);
        }, value);
    },
    async getEditorValue() {
      return page.locator('.graphiql-query-editor .cm-s-graphiql').evaluate(editorElement => {
        const editor = (editorElement as any).CodeMirror;

        return editor.getValue() as string;
      });
    },
    async openNewTab() {
      await page.locator('button[aria-label="New tab"]').click();
      await this.assertActiveTab('untitled');
    },
    async assertActiveTab(name) {
      await expect(
        page.locator('li.graphiql-tab-active > button[aria-controls="graphiql-session"]'),
      ).toContainText(name);
    },
    async closeActiveTab() {
      await page.locator('li.graphiql-tab-active > button.graphiql-tab-close').click();
    },
    async closeTabsUntilOneLeft() {
      const tabs = page.locator('li.graphiql-tab');

      while ((await tabs.count()) > 1) {
        const initialCount = await tabs.count();
        await this.closeActiveTab();
        await expect(tabs).toHaveCount(initialCount - 1);
      }
    },
    async setMonacoEditorContents(editorCyName, text) {
      const editor = page.locator(`[data-cy="${editorCyName}"]`);
      const firstLine = text
        .split('\n')
        .map(line => line.trim())
        .find(Boolean);
      const didSetValue = await page.evaluate(
        ({ editorCyName, text }) => {
          const global = window as unknown as {
            __HIVE_E2E_MONACO_EDITORS?: Record<
              string,
              { setValue(value: string): void; getValue(): string }
            >;
          };
          const editor = global.__HIVE_E2E_MONACO_EDITORS?.[editorCyName];

          if (!editor) {
            return false;
          }

          editor.setValue(text);
          return editor.getValue() === text;
        },
        { editorCyName, text },
      );

      if (didSetValue) {
        if (firstLine) {
          await expect(editor).toContainText(firstLine);
        }

        return;
      }

      const textarea = editor.locator('textarea').first();
      await textarea.click({ force: true });
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.press('Backspace');
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.evaluate(nextText => navigator.clipboard.writeText(nextText), text);
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');

      if (firstLine) {
        await expect(editor).toContainText(firstLine);
      }
    },
    async openCollectionsPanel() {
      await page
        .locator(
          '[aria-label*="Show Documentation Explorer"], [aria-label*="Show GraphiQL Explorer"]',
        )
        .first()
        .click();
      await page.locator('[aria-label="Show Operation Collections"]').click();
      await this.closeTabsUntilOneLeft();
    },
  };
}
