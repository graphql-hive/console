import { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/env/backend';

export default async function githubConnectOrg(req: NextApiRequest, res: NextApiResponse) {
  console.log('Connect to Github');
  const orgId = req.query.orgId;
  console.log('Organization', orgId);

  const url = `https://github.com/apps/${env.github.appName}/installations/new`;

  const redirectUrl = `${env.appBaseUrl.replace(/\/$/, '')}/api/github/callback`;

  res.redirect(`${url}?state=${orgId}&redirect_url=${redirectUrl}`);
}
