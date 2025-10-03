import { GitHubIntegrationManager } from '../providers/github-integration-manager';
import { SlackIntegrationManager } from '../providers/slack-integration-manager';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  | 'gitHubIntegration'
  | 'hasGitHubIntegration'
  | 'hasSlackIntegration'
  | 'viewerCanModifyGitHubIntegration'
  | 'viewerCanModifySlackIntegration'
> = {
  gitHubIntegration: async (organization, _, { injector }) => {
    const repositories = await injector.get(GitHubIntegrationManager).getRepositories({
      organizationId: organization.id,
    });

    if (repositories == null) {
      return null;
    }

    return {
      repositories,
    };
  },
  hasGitHubIntegration: (organization, _, { injector }) => {
    return injector.get(GitHubIntegrationManager).isAvailable({
      organizationId: organization.id,
    });
  },
  hasSlackIntegration: (organization, _, { injector }) => {
    return injector.get(SlackIntegrationManager).isAvailable({
      organizationId: organization.id,
    });
  },
  viewerCanModifyGitHubIntegration: async (organization, _arg, { session, injector }) => {
    const isEnabled = injector.get(GitHubIntegrationManager).isEnabled();

    if (!isEnabled) {
      return false;
    }

    return session.canPerformAction({
      action: 'gitHubIntegration:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanModifySlackIntegration: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'slackIntegration:modify',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
};
