/**
 * This module uses Vitest's fixture system to make common usage patterns
 * of our testkit easily consumable in test cases. @see https://vitest.dev/guide/test-context.html#test-extend
 */

import { test as testBase } from 'vitest';
import { createTmpFileController, TmpFileController } from './fs';

interface Context {
  graphqlFile: TmpFileController;
}

export const test = testBase.extend<Context>({
  graphqlFile: async ({}, use) => {
    const graphqlFile = createTmpFileController({ extension: 'graphql' });
    await use(graphqlFile);
  },
});
