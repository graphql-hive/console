import { stringify } from 'node:querystring';
import { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/env/backend';
import { graphql } from '@/lib/api/utils';

async function fetchData({
  url,
  headers,
  body,
}: {
  url: string;
  headers: Record<string, any>;
  body: string;
}) {
  const response = await fetch(url, {
    headers,
    method: 'POST',
    body,
  } as any);

  return response.json();
}

export default async function slackCallback(req: NextApiRequest, res: NextApiResponse) {
  console.log('Slack Integration Callback');

  if (env.slack === null) {
    throw new Error('The Slack integration is not enabled.');
  }

  const { code } = req.query;
  const orgId = req.query.state;

  const slackResponse = await fetchData({
    url: 'https://slack.com/api/oauth.v2.access',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: stringify({
      client_id: env.slack.clientId,
      client_secret: env.slack.clientSecret,
      code,
    }),
  });

  const token = slackResponse.access_token;

  await graphql({
    url: `${env.appBaseUrl}/api/proxy`,
    headers: {
      ...req.headers,
      'content-type': 'application/json',
    },
    operationName: 'addSlackIntegration',
    query: /* GraphQL */ `
      mutation addSlackIntegration($input: AddSlackIntegrationInput!) {
        addSlackIntegration(input: $input)
      }
    `,
    variables: {
      input: {
        organization: orgId,
        token,
      },
    },
  });
  res.redirect(`/${orgId}/view/settings`);
}
