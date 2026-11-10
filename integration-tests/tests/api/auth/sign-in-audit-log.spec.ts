import humanId from 'human-id';
import { password } from 'testkit/auth';
import { waitForExpectations } from 'testkit/flow';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import z from 'zod';
import { clickHouseQuery } from '../../../testkit/clickhouse';
import { assertSignInUpSucceeded } from '../../../testkit/oidc-integration';

const baseUrl = await getServiceHost('server', 3001).then(r => `http://${r}`);

/**
 * Sign in audit logs are recorded in the background (after the response was sent),
 * so assertions on them need to be wrapped in `waitForExpectations`.
 */
async function getSignInAuditLogs(
  organizationId: string,
  eventAction: 'USER_SIGNED_IN' | 'USER_SIGN_IN_FAILED',
) {
  const result = await clickHouseQuery<unknown>(`
    SELECT
      user_email AS "userEmail"
      , ip_address AS "ipAddress"
      , user_agent AS "userAgent"
      , metadata
    FROM audit_logs
    WHERE organization_id = '${organizationId}'
      AND event_action = '${eventAction}'
  `);
  return SignInAuditLogListModel.parse(result.data);
}

const SignInAuditLogMetadataModel = z.object({
  method: z.enum(['emailpassword', 'github', 'google', 'okta', 'oidc']),
  oidcIntegrationId: z.string().nullable(),
  reason: z.string().optional(),
  email: z.string().nullable().optional(),
  emailVerified: z.boolean().nullable().optional(),
});

const SignInAuditLogListModel = z.array(
  z.object({
    userEmail: z.string(),
    ipAddress: z.string(),
    userAgent: z.string(),
    metadata: z
      .string()
      .transform(value => JSON.parse(value) as unknown)
      .pipe(SignInAuditLogMetadataModel),
  }),
);

function signIn(email: string, password: string) {
  return fetch(baseUrl + '/auth-api/signin', {
    method: 'POST',
    body: JSON.stringify({
      formFields: [
        { id: 'email', value: email },
        { id: 'password', value: password },
      ],
    }),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'sign-in-audit-log-test',
    },
  }).then(res => res.json());
}

test.concurrent(
  'email/password sign in is recorded for the organization that verified the email domain',
  async ({ expect }) => {
    const seed = initSeed();
    const domain = humanId({ separator: '', capitalize: false }) + '.local';
    const email = 'admin@' + domain;
    const owner = await seed.createOwner(true, email);
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    await oidcIntegration.registerFakeDomain(domain);

    expect(await signIn(email, password)).toMatchObject({ status: 'OK' });

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGNED_IN');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userEmail: email,
        ipAddress: expect.stringMatching(/.+/),
        userAgent: 'sign-in-audit-log-test',
        metadata: {
          method: 'emailpassword',
          email,
          emailVerified: true,
          oidcIntegrationId: null,
        },
      });
    });
  },
);

test.concurrent(
  'OIDC sign in is recorded for the organization linked to the OIDC integration',
  async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    const oidcAuth = await oidcIntegration.createMockServerAndUpdateIntegrationEndpoints();
    // the domain is not verified, so the event is only attributed through the OIDC integration
    const email = 'marty.mcfly@' + humanId({ separator: '', capitalize: false }) + '.local';
    oidcAuth.setUser({ email, userIdClaim: email });

    const authPayload = await oidcAuth.runGetAuthorizationUrl();
    const signInUpResult = await oidcAuth.runSignInUp({ state: authPayload.state });
    assertSignInUpSucceeded(signInUpResult, 'Expected sign in/up to succeed.');

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGNED_IN');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userEmail: email,
        metadata: {
          method: 'oidc',
          email,
          emailVerified: null,
          oidcIntegrationId: oidcIntegration.oidcIntegration.id,
        },
      });
    });
  },
);

test.concurrent(
  'failed email/password sign in attempts are recorded for the organization that verified the email domain',
  async ({ expect }) => {
    const seed = initSeed();
    const domain = humanId({ separator: '', capitalize: false }) + '.local';
    const email = 'admin@' + domain;
    const owner = await seed.createOwner(true, email);
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    await oidcIntegration.registerFakeDomain(domain);

    expect(await signIn(email, 'wrong-password')).toMatchObject({
      status: 'WRONG_CREDENTIALS_ERROR',
    });
    expect(await signIn('does-not-exist@' + domain, password)).toMatchObject({
      status: 'WRONG_CREDENTIALS_ERROR',
    });

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGN_IN_FAILED');
      expect(logs).toHaveLength(2);
      // failed attempts are not attributed to a user, as the actor is not authenticated
      expect(logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userEmail: '',
            userAgent: 'sign-in-audit-log-test',
            metadata: expect.objectContaining({
              method: 'emailpassword',
              reason: 'INVALID_CREDENTIALS',
              email,
              oidcIntegrationId: null,
            }),
          }),
          expect.objectContaining({
            userEmail: '',
            metadata: expect.objectContaining({
              method: 'emailpassword',
              reason: 'UNKNOWN_USER',
              email: 'does-not-exist@' + domain,
            }),
          }),
        ]),
      );
    });
  },
);

test.concurrent(
  'failed OIDC sign in is recorded for the organization linked to the OIDC integration',
  async ({ expect }) => {
    const seed = initSeed();
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    await org.setFeatureFlag('scim', true);
    const oidcIntegration = await org.createOIDCIntegration();
    const oidcAuth = await oidcIntegration.createMockServerAndUpdateIntegrationEndpoints({
      userProvisioningRequired: true,
    });
    const email = 'marty.mcfly@' + humanId({ separator: '', capitalize: false }) + '.local';
    oidcAuth.setUser({ email, userIdClaim: email });

    const authPayload = await oidcAuth.runGetAuthorizationUrl();
    const signInUpResult = await oidcAuth.runSignInUp({ state: authPayload.state });
    expect(signInUpResult.type).toEqual('error');

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGN_IN_FAILED');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userEmail: '',
        metadata: {
          method: 'oidc',
          reason: 'USER_NOT_PROVISIONED',
          email,
          oidcIntegrationId: oidcIntegration.oidcIntegration.id,
        },
      });
    });
  },
);

test.concurrent(
  'email/password sign in with an unverified email is recorded without an actor for the organization that verified the email domain',
  async ({ expect }) => {
    const seed = initSeed();
    const domain = humanId({ separator: '', capitalize: false }) + '.local';
    const email = 'admin@' + domain;
    // users with an unverified email can not create organizations, so a separate verified user owns it
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    await oidcIntegration.registerFakeDomain(domain);
    await seed.authenticate(email, { verifyEmail: false });

    expect(await signIn(email, password)).toMatchObject({ status: 'OK' });

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGNED_IN');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        // the sign in is not attributed to the owner of the email address, as it is not proven
        userEmail: '',
        userAgent: 'sign-in-audit-log-test',
        metadata: {
          method: 'emailpassword',
          email,
          emailVerified: false,
          oidcIntegrationId: null,
        },
      });
    });
  },
);

test.concurrent(
  'OIDC sign in is not recorded for another organization that verified the email domain',
  async ({ expect }) => {
    const seed = initSeed();

    // organization A owns the domain
    const ownerA = await seed.createOwner();
    const orgA = await ownerA.createOrg();
    const domain = await (await orgA.createOIDCIntegration()).registerFakeDomain();

    // organization B's identity provider asserts an email address on organization A's domain
    const ownerB = await seed.createOwner();
    const orgB = await ownerB.createOrg();
    const oidcIntegrationB = await orgB.createOIDCIntegration();
    const oidcAuth = await oidcIntegrationB.createMockServerAndUpdateIntegrationEndpoints();
    const email = 'marty.mcfly@' + domain;
    oidcAuth.setUser({ email, userIdClaim: email });

    const authPayload = await oidcAuth.runGetAuthorizationUrl();
    const signInUpResult = await oidcAuth.runSignInUp({ state: authPayload.state });
    assertSignInUpSucceeded(signInUpResult, 'Expected sign in/up to succeed.');

    // Organization A is never looked up for OIDC sign ins,
    // so once organization B's event is visible, the sign in was fully processed.
    await waitForExpectations(async () => {
      expect(await getSignInAuditLogs(orgB.organization.id, 'USER_SIGNED_IN')).toHaveLength(1);
    });
    expect(await getSignInAuditLogs(orgA.organization.id, 'USER_SIGNED_IN')).toHaveLength(0);
  },
);

test.concurrent(
  'failed email/password sign in attempts with a malformed email are not recorded',
  async ({ expect }) => {
    const seed = initSeed();
    const domain = humanId({ separator: '', capitalize: false }) + '.local';
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const oidcIntegration = await org.createOIDCIntegration();
    await oidcIntegration.registerFakeDomain(domain);

    // the sign in body is not validated as an email address, so these reach the audit log path
    for (const email of ['foo', 'foo@', 'does-not-exist@' + domain + '@other.local']) {
      expect(await signIn(email, password)).toMatchObject({
        status: 'WRONG_CREDENTIALS_ERROR',
      });
    }
    // a well-formed attempt, so we know when the attempts above have been processed
    const email = 'does-not-exist@' + domain;
    expect(await signIn(email, password)).toMatchObject({
      status: 'WRONG_CREDENTIALS_ERROR',
    });

    await waitForExpectations(async () => {
      const logs = await getSignInAuditLogs(org.organization.id, 'USER_SIGN_IN_FAILED');
      // the malformed email addresses must not be attributed to the verified domain owner
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        metadata: {
          method: 'emailpassword',
          reason: 'UNKNOWN_USER',
          email,
        },
      });
    });
  },
);
