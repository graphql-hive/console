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
      await page.goto(`/${slug}/laboratory`);
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
      await expect(page.locator('button[aria-controls="graphiql-session"]')).toContainText(
        'untitled',
      );
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
      while ((await page.locator('li.graphiql-tab').count()) > 1) {
        await this.closeActiveTab();
      }
    },
    async setMonacoEditorContents(editorCyName, text) {
      const textarea = page.locator(`[data-cy="${editorCyName}"] textarea`);
      await textarea.focus();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.evaluate(nextText => {
        document.execCommand('insertText', false, nextText);
      }, text);
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
