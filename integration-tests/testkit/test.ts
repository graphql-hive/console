import { test as testBase } from 'vitest';
import { CLI, createCLI } from './cli';
import { ProjectType } from './gql/graphql';
import { initSeed, OrgSeed, OwnerSeed, ProjectSeed, Seed, TargetAccessTokenSeed } from './seed';

interface Context {
  seed: Seed;
  owner: OwnerSeed;
  org: OrgSeed;
  projectSingle: ProjectSeed;
  targetAccessTokenSingle: TargetAccessTokenSeed;
  cliSingle: CLI;
  projectFederation: ProjectSeed;
  targetAccessTokenFederation: TargetAccessTokenSeed;
  cliFederation: CLI;
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
});
