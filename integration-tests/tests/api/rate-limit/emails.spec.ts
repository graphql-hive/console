import { ProjectType } from 'testkit/gql/graphql';
import * as emails from '../../../testkit/emails';
import { pollFor, updateOrgRateLimit, waitFor } from '../../../testkit/flow';
import { initSeed } from '../../../testkit/seed';

function filterEmailsByOrg(orgSlug: string, emails: emails.Email[]) {
  return emails
    .filter(email => email.subject.includes(orgSlug))
    .map(email => ({
      subject: email.subject,
      email: email.to,
    }));
}

test('rate limit approaching and reached for organization', async () => {
  const { createOrg, ownerToken, ownerEmail } = await initSeed().createOwner();
  const { createProject, organization } = await createOrg();
  const { createTargetAccessToken, waitForRequestsCollected } = await createProject(ProjectType.Single);

  await updateOrgRateLimit(
    {
      organizationSlug: organization.slug,
    },
    {
      operations: 11,
    },
    ownerToken,
  );

  const { collectLegacyOperations: collectOperations } = await createTargetAccessToken({});

  const op = {
    operation: 'query ping { ping }',
    operationName: 'ping',
    fields: ['Query', 'Query.ping'],
    execution: {
      ok: true,
      duration: 200_000_000,
      errorsTotal: 0,
    },
  };

  // Collect operations and check for warning
  const collectResult = await collectOperations(new Array(10).fill(op));
  expect(collectResult.status).toEqual(200);

  await waitForRequestsCollected(10);
  
  // wait for the rate limit email to send...
  await pollFor(async () => {
    let sent = await emails.history();
    return filterEmailsByOrg(organization.slug, sent)?.length === 1;
  });

  let sent = await emails.history();
  expect(sent).toContainEqual({
    to: ownerEmail,
    subject: `${organization.slug} is approaching its rate limit`,
    body: expect.any(String),
  });
  expect(filterEmailsByOrg(organization.slug, sent)).toHaveLength(1);

  // Collect operations and check for rate-limit reached
  const collectMoreResult = await collectOperations([op, op]);
  expect(collectMoreResult.status).toEqual(200);

  await waitForRequestsCollected(12);
  
  // wait for the quota email to send...
  await pollFor(async () => {
    let sent = await emails.history();
    return filterEmailsByOrg(organization.slug, sent)?.length === 2;
  });

  sent = await emails.history();

  expect(sent).toContainEqual({
    to: ownerEmail,
    subject: `GraphQL-Hive operations quota for ${organization.slug} exceeded`,
    body: expect.any(String),
  });
  expect(filterEmailsByOrg(organization.slug, sent)).toHaveLength(2);

  // Make sure we don't send the same email again
  const collectEvenMoreResult = await collectOperations([op, op]);
  expect(collectEvenMoreResult.status).toEqual(429);

  // @note we can't poll for any state here because nothing should change. Must wait unfortunately...
  await waitFor(4_000);

  // Nothing new
  sent = await emails.history();
  expect(filterEmailsByOrg(organization.slug, sent)).toHaveLength(2);
});
