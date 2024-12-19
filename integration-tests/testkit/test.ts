/**
 * This module uses Vitest's fixture system to make common usage patterns
 * of our testkit easily consumable in test cases. @see https://vitest.dev/guide/test-context.html#test-extend
 */

import { test as testBase } from 'vitest';
import { CLI, createCLI } from './cli';
import { ProjectType } from './gql/graphql';
import { initSeed, OrgSeed, OwnerSeed, ProjectSeed, Seed, TargetAccessTokenSeed } from './seed';

interface Context {
  seed: Seed;
  owner: OwnerSeed;
  org: OrgSeed;
  //
  // "single" branch
  //
  projectSingle: ProjectSeed;
  targetAccessTokenSingle: TargetAccessTokenSeed;
  cliSingle: CLI;
  //
  // "federation" branch
  //
  projectFederation: ProjectSeed;
  targetAccessTokenFederation: TargetAccessTokenSeed;
  cliFederation: CLI;
  //
  // "stitching" branch
  //
  projectStitching: ProjectSeed;
  targetAccessTokenStitching: TargetAccessTokenSeed;
  cliStitching: CLI;
}

export const test = testBase.extend<Context>({
  seed: async ({}, use) => {
    const seed = await initSeed();
    await use(seed);
  },
  owner: async ({ seed }, use) => {
    const owner = await seed.createOwner();
    await use(owner);
  },
  org: async ({ owner }, use) => {
    const org = await owner.createOrg();
    await use(org);
  },
  //
  // "single" branch
  //
  projectSingle: async ({ org }, use) => {
    const project = await org.createProject(ProjectType.Single);
    await use(project);
  },
  targetAccessTokenSingle: async ({ projectSingle }, use) => {
    const targetAccessToken = await projectSingle.createTargetAccessToken({});
    await use(targetAccessToken);
  },
  cliSingle: async ({ targetAccessTokenSingle }, use) => {
    const cli = createCLI({
      readwrite: targetAccessTokenSingle.secret,
      readonly: targetAccessTokenSingle.secret,
    });
    await use(cli);
  },
  //
  // "federation" branch
  //
  projectFederation: async ({ org }, use) => {
    const project = await org.createProject(ProjectType.Federation);
    await use(project);
  },
  targetAccessTokenFederation: async ({ projectFederation }, use) => {
    const targetAccessToken = await projectFederation.createTargetAccessToken({});
    await use(targetAccessToken);
  },
  cliFederation: async ({ targetAccessTokenFederation }, use) => {
    const cli = createCLI({
      readwrite: targetAccessTokenFederation.secret,
      readonly: targetAccessTokenFederation.secret,
    });
    await use(cli);
  },
  //
  // "stitching" branch
  //
  projectStitching: async ({ org }, use) => {
    const project = await org.createProject(ProjectType.Stitching);
    await use(project);
  },
  targetAccessTokenStitching: async ({ projectStitching }, use) => {
    const targetAccessToken = await projectStitching.createTargetAccessToken({});
    await use(targetAccessToken);
  },
  cliStitching: async ({ targetAccessTokenStitching }, use) => {
    const cli = createCLI({
      readwrite: targetAccessTokenStitching.secret,
      readonly: targetAccessTokenStitching.secret,
    });
    await use(cli);
  },
});
