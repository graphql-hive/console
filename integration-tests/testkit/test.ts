/**
 * This module uses Vitest's fixture system to make common usage patterns
 * of our testkit easily consumable in test cases. @see https://vitest.dev/guide/test-context.html#test-extend
 */

import { test as testBase } from 'vitest';
import { TmpFile, tmpFile } from './fs';

interface Context {
  sdlFile: TmpFile;
}

export const test = testBase.extend<Context>({
  sdlFile: async ({}, use) => {
    const sdlFile = tmpFile('graphql');
    await use(sdlFile);
  },
});
