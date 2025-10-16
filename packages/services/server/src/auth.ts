import bcrypt from 'bcrypt';
import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { FastifyBaseLogger } from 'fastify';
import Pg from 'pg';
import { sso } from '@better-auth/sso';
import { Storage } from '@hive/api';
import { EmailsApi } from '@hive/emails';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { env } from './environment';

const pool = new Pg.Pool({
  user: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.db,
  host: env.postgres.host,
  port: env.postgres.port,
  ssl: env.postgres.ssl,
});

export type AuthInstance = ReturnType<typeof createAuth>;

export const auth = createAuth();

export function createAuth() {
  const emailsService = createTRPCProxyClient<EmailsApi>({
    links: [httpLink({ url: `${env.hiveServices.emails?.endpoint}/trpc` })],
  });

  return betterAuth({
    baseURL: env.graphql.origin,
    database: pool,
    trustedOrigins: [env.hiveServices.webApp.url],
    user: {
      modelName: 'better_auth_users',
    },
    session: {
      modelName: 'better_auth_sessions',
    },
    account: {
      modelName: 'better_auth_accounts',
    },
    verification: {
      modelName: 'better_auth_verifications',
    },
    ssoProvider: {
      modelName: 'better_auth_sso_providers',
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 99,
      requireEmailVerification: env.auth.requireEmailVerification,
      password: {
        async hash(password) {
          return await bcrypt.hash(password, 11);
        },
        async verify({ password, hash }) {
          return await bcrypt.compare(password, hash);
        },
      },
      async sendResetPassword({ user, url }) {
        await emailsService.sendPasswordResetEmail.mutate({
          user: {
            id: user.id,
            email: user.email,
          },
          passwordResetLink: url,
        });
      },
    },
    emailVerification: {
      async sendVerificationEmail({ user, url }) {
        await emailsService.sendEmailVerificationEmail.mutate({
          user: {
            id: user.id,
            email: user.email,
          },
          emailVerifyLink: url,
        });
      },
    },
    socialProviders: {
      google: env.auth.google
        ? {
            clientId: env.auth.google.clientId,
            clientSecret: env.auth.google.clientSecret,
            scope: [
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
              'openid',
            ],
          }
        : undefined,
      github: env.auth.github
        ? {
            clientId: env.auth.github.clientId,
            clientSecret: env.auth.github.clientSecret,
            scope: ['read:user', 'user:email'],
          }
        : undefined,
    },
    plugins: [
      env.organizationOIDC ? sso() : undefined,
      env.auth.okta
        ? genericOAuth({
            config: [
              {
                providerId: 'okta',
                clientId: env.auth.okta.clientId,
                clientSecret: env.auth.okta.clientSecret,
                scopes: ['openid', 'email', 'profile', 'okta.users.read.self'],
                authorizationUrl: `${env.auth.okta.endpoint}/oauth2/v1/authorize`,
                tokenUrl: `${env.auth.okta.endpoint}/oauth2/v1/token`,
              },
            ],
          })
        : undefined,
    ].filter(v => v != null),
    advanced: {
      cookiePrefix: 'hive-auth',
    },
  });
}

type OidcIdLookupResponse =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      title: string;
      description: string;
      status: number;
    };

export async function oidcIdLookup(
  slug: string,
  storage: Storage,
  logger: FastifyBaseLogger,
): Promise<OidcIdLookupResponse> {
  logger.debug('Looking up OIDC integration ID for organization %s', slug);
  const oidcId = await storage.getOIDCIntegrationIdForOrganizationSlug({ slug });

  if (!oidcId) {
    return {
      ok: false,
      title: 'SSO integration not found',
      description: 'Your organization lacks an SSO integration or it does not exist.',
      status: 404,
    };
  }

  return {
    ok: true,
    id: oidcId,
  };
}
