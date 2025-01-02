import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'isProjectNameInGitHubCheckEnabled' | '__isTypeOf'> = {
  isProjectNameInGitHubCheckEnabled: project => {
    return project.useProjectNameInGithubCheck;
  },
};
