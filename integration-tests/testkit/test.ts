/**
 * This module uses Vitest's fixture system to make common usage patterns
 * of our testkit easily consumable in test cases. @see https://vitest.dev/guide/test-context.html#test-extend
 */

import { test as testBase } from 'vitest';
import { TmpFile, tmpFile } from './fs';

interface Context {
  sdlFile: TmpFile;
  // seed: Seed;
  // owner: OwnerSeed;
  // org: OrgSeed;
  // //
  // // "single" branch
  // //
  // projectSingle: ProjectSeed;
  // tokenForProjectSingle: TargetAccessTokenSeed;
  // cliForProjectSingle: CLI;
  // //
  // // "federation" branch
  // //
  // projectFederation: ProjectSeed;
  // tokenForProjectFederation: TargetAccessTokenSeed;
  // cliForProjectFederation: CLI;
  // //
  // // "stitching" branch
  // //
  // projectStitching: ProjectSeed;
  // tokenForProjectStitching: TargetAccessTokenSeed;
  // cliForProjectStitching: CLI;
}

export const test = testBase.extend<Context>({
  sdlFile: async ({}, use) => {
    const sdlFile = tmpFile('graphql');
    await use(sdlFile);
  },
  // seed: async ({}, use) => {
  //   const seed = await initSeed();
  //   await use(seed);
  // },
  // owner: async ({ seed }, use) => {
  //   const owner = await seed.createOwner();
  //   await use(owner);
  // },
  // org: async ({ owner }, use) => {
  //   const org = await owner.createOrg();
  //   await use(org);
  // },
  // //
  // // "single" branch
  // //
  // projectSingle: async ({ org }, use) => {
  //   const project = await org.createProject(ProjectType.Single);
  //   await use(project);
  // },
  // tokenForProjectSingle: async ({ projectSingle }, use) => {
  //   const token = await projectSingle.createTargetAccessToken({});
  //   await use(token);
  // },
  // cliForProjectSingle: async ({ tokenForProjectSingle }, use) => {
  //   const cli = createCLI({
  //     readwrite: tokenForProjectSingle.secret,
  //     readonly: tokenForProjectSingle.secret,
  //   });
  //   await use(cli);
  // },
  // //
  // // "federation" branch
  // //
  // projectFederation: async ({ org }, use) => {
  //   const project = await org.createProject(ProjectType.Federation);
  //   await use(project);
  // },
  // tokenForProjectFederation: async ({ projectFederation }, use) => {
  //   const token = await projectFederation.createTargetAccessToken({});
  //   await use(token);
  // },
  // cliForProjectFederation: async ({ tokenForProjectFederation }, use) => {
  //   const cli = createCLI({
  //     readwrite: tokenForProjectFederation.secret,
  //     readonly: tokenForProjectFederation.secret,
  //   });
  //   await use(cli);
  // },
  // //
  // // "stitching" branch
  // //
  // projectStitching: async ({ org }, use) => {
  //   const project = await org.createProject(ProjectType.Stitching);
  //   await use(project);
  // },
  // tokenForProjectStitching: async ({ projectStitching }, use) => {
  //   const token = await projectStitching.createTargetAccessToken({});
  //   await use(token);
  // },
  // cliForProjectStitching: async ({ tokenForProjectStitching }, use) => {
  //   const cli = createCLI({
  //     readwrite: tokenForProjectStitching.secret,
  //     readonly: tokenForProjectStitching.secret,
  //   });
  //   await use(cli);
  // },
});
