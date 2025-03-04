import { IdTranslator } from '../../../shared/providers/id-translator';
import { GitHubIntegrationManager } from '../../providers/github-integration-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addGitHubIntegration: NonNullable<MutationResolvers['addGitHubIntegration']> = async (
  _,
  { input },
  { injector },
) => {
  const organization = await injector.get(IdTranslator).translateOrganizationId(input);

  await injector.get(GitHubIntegrationManager).register({
    organizationId: organization,
    installationId: input.installationId,
  });

  return true;
};
