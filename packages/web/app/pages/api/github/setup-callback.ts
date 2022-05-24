import { NextApiRequest, NextApiResponse } from 'next';
import { graphql } from '@/lib/api/utils';
import { ensureGithubIntegration } from './callback';

export default async function githubSetupCallback(req: NextApiRequest, res: NextApiResponse) {
  console.log('GitHub Integration Setup Callback');
  const installationId = req.query.installation_id as string;
  let orgId = req.query.state as string | undefined;

  if (orgId) {
    await ensureGithubIntegration(req, {
      installationId,
      orgId,
    });
  } else {
    const result = await graphql<{
      organizationByGitHubInstallationId?: {
        cleanId: string;
      };
    }>({
      url: `${process.env.APP_BASE_URL.replace(/\/$/, '')}/api/proxy`,
      headers: {
        ...req.headers,
        'content-type': 'application/json',
      },
      operationName: 'getOrganizationByGitHubInstallationId',
      query: /* GraphQL */ `
        query getOrganizationByGitHubInstallationId($installation: ID!) {
          organizationByGitHubInstallationId(input: $input) {
            id
            cleanId
          }
        }
      `,
      variables: {
        installation: installationId,
      },
    });

    orgId = result.data?.organizationByGitHubInstallationId?.cleanId;
  }

  if (orgId) {
    res.redirect(`/${orgId}/settings`);
  } else {
    res.redirect('/');
  }
}
