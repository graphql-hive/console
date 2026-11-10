import { pollFor } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { clickHouseInsert, clickHouseQuery, flushAsyncInserts } from '../../../testkit/clickhouse';
import { history } from '../../../testkit/emails';

const InvitationDeliveriesQuery = graphql(`
  query InvitationDeliveriesQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      invitations {
        edges {
          node {
            email
            delivery {
              ok
              statusCode
              statusText
              attempt
              maxAttempts
            }
          }
        }
      }
    }
  }
`);

type DeliveryRow = {
  delivery_type: string;
  destination: string;
  event: string;
  idempotency_key: string;
  ok: number;
  status_code: number;
  status_text: string;
  attempt: number;
  max_attempts: number;
  metadata: Record<string, string>;
};

test.concurrent(
  'records each attempt to email an invitation with the mail provider answer, shown on the invitation',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { inviteMember, organization } = await createOrg();

    const accepted = seed.generateEmail();
    // The mock provider refuses a local part ending in +bounce, like Postmark refuses an
    // inactive recipient.
    const refused = accepted.replace('@', '+bounce@');

    const acceptedInvitation = await inviteMember(accepted);
    const refusedInvitation = await inviteMember(refused);
    expect(acceptedInvitation.ok?.createdOrganizationInvitation.code).toBeDefined();
    expect(refusedInvitation.ok?.createdOrganizationInvitation.code).toBeDefined();

    await pollFor(async () => (await history(accepted)).length > 0);
    expect(await history(refused)).toEqual([]);

    let rows: DeliveryRow[] = [];
    await pollFor(async () => {
      await flushAsyncInserts();
      const result = await clickHouseQuery<DeliveryRow>(
        `SELECT delivery_type, destination, event, idempotency_key, ok, status_code, status_text, attempt, max_attempts, metadata
         FROM outbound_deliveries
         WHERE organization_id = '${organization.id}'
           AND delivery_type = 'EMAIL'
           AND destination IN ('${accepted}', '${refused}')`,
      );
      rows = result.data;
      return (
        rows.some(row => row.destination === accepted) &&
        rows.some(row => row.destination === refused)
      );
    });

    const acceptedRow = rows.find(row => row.destination === accepted);
    expect(acceptedRow).toEqual({
      delivery_type: 'EMAIL',
      destination: accepted,
      event: 'organization_invitation',
      idempotency_key: `organization-invitation:${acceptedInvitation.ok!.createdOrganizationInvitation.createdAt}:${accepted}`,
      ok: 1,
      status_code: 200,
      status_text: 'OK',
      attempt: 1,
      max_attempts: 25,
      metadata: {
        subject: `You have been invited to join ${organization.slug}`,
        job_id: expect.any(String),
        hive_request_id: expect.any(String),
        message_id: expect.stringMatching(/^mock-/),
      },
    });
    // Never the invitation link or code.
    expect(JSON.stringify(acceptedRow!.metadata)).not.toContain(
      acceptedInvitation.ok!.createdOrganizationInvitation.code,
    );

    // The refused address is retried, so there may be more than one row by now.
    expect(rows.filter(row => row.destination === refused)).toContainEqual({
      delivery_type: 'EMAIL',
      destination: refused,
      event: 'organization_invitation',
      idempotency_key: `organization-invitation:${refusedInvitation.ok!.createdOrganizationInvitation.createdAt}:${refused}`,
      ok: 0,
      status_code: 422,
      status_text: '406: You tried to send to a recipient that has been marked as inactive.',
      attempt: 1,
      max_attempts: 25,
      metadata: {
        subject: `You have been invited to join ${organization.slug}`,
        job_id: expect.any(String),
        hive_request_id: expect.any(String),
      },
    });

    const result = await execute({
      document: InvitationDeliveriesQuery,
      variables: { organizationSlug: organization.slug },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());
    const invitations = result.organization!.invitations!.edges.map(edge => edge.node);

    expect(invitations).toContainEqual({
      email: accepted,
      delivery: { ok: true, statusCode: 200, statusText: 'OK', attempt: 1, maxAttempts: 25 },
    });
    expect(invitations).toContainEqual({
      email: refused,
      delivery: {
        ok: false,
        statusCode: 422,
        statusText: '406: You tried to send to a recipient that has been marked as inactive.',
        attempt: expect.any(Number),
        maxAttempts: 25,
      },
    });
  },
);

/** How many attempts are recorded under an idempotency key. */
async function countAttempts(key: string): Promise<number> {
  await flushAsyncInserts();
  const result = await clickHouseQuery<{ attempts: string }>(
    `SELECT count() AS attempts FROM outbound_deliveries WHERE idempotency_key = '${key}'`,
  );
  return Number(result.data[0]?.attempts ?? 0);
}

test.concurrent(
  "a re-invited address shows the new invitation's attempts, not the retries of the earlier one",
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { inviteMember, organization } = await createOrg();
    const refused = seed.generateEmail().replace('@', '+bounce@');
    const invitationKey = (invitation: { createdAt: string }) =>
      `organization-invitation:${invitation.createdAt}:${refused}`;

    const first = await inviteMember(refused);
    const firstKey = invitationKey(first.ok!.createdOrganizationInvitation);
    await pollFor(async () => (await countAttempts(firstKey)) > 0);

    // Inviting the address again deletes the invitation and creates a new one with its own job.
    const second = await inviteMember(refused);
    const secondKey = invitationKey(second.ok!.createdOrganizationInvitation);
    expect(secondKey).not.toBe(firstKey);
    await pollFor(async () => (await countAttempts(secondKey)) > 0);

    // The first invitation's job keeps retrying for hours after the re-invite, on an exponential
    // backoff. This is the row it writes later: newer than anything the new job has recorded.
    await clickHouseInsert(`
      INSERT INTO "outbound_deliveries" (
        "timestamp", "organization_id", "delivery_type", "destination", "event", "idempotency_key",
        "attempt", "max_attempts", "ok", "status_code", "status_text", "duration_ms", "metadata"
      )
      VALUES (
        now() + toIntervalMinute(1), '${organization.id}', 'EMAIL', '${refused}',
        'organization_invitation', '${firstKey}', 9, 25, 0, 422, 'Retry of the earlier invitation',
        5, map('subject', 'You have been invited to join ${organization.slug}')
      )
    `);

    const result = await execute({
      document: InvitationDeliveriesQuery,
      variables: { organizationSlug: organization.slug },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());
    const invitations = result.organization!.invitations!.edges.map(edge => edge.node);

    expect(invitations).toEqual([
      {
        email: refused,
        delivery: {
          ok: false,
          statusCode: 422,
          statusText: '406: You tried to send to a recipient that has been marked as inactive.',
          attempt: expect.any(Number),
          maxAttempts: 25,
        },
      },
    ]);
  },
);
