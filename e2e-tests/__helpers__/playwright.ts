import { Page } from '@playwright/test';

export const enhancePageWithHelpers =
  <page extends Page, helpers extends object>(helpersConstructor: HelpersConstructor<helpers>) =>
  (page: Page): page & helpers => {
    Object.assign(page, helpersConstructor(page));
    return page as page & helpers;
  };

export type HelpersConstructor<$Helpers extends object> = (page: Page) => $Helpers;
