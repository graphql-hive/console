import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db';
import { genericOAuth } from 'better-auth/plugins';
import pg from 'pg';
import { ServiceLogger } from '@hive/service-common';
import { env } from '../environment';
import { sso } from './sso';

const { Pool } = pg;

const pool = new Pool({
  user: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.db,
  port: env.postgres.port,
  host: env.postgres.host,
  ssl: env.postgres.ssl,
  max: 5,
});

export type AuthInstance = ReturnType<typeof createAuth>;

export function createAuth(options: { logger: ServiceLogger }) {
  const logger = options.logger;

  const auth = betterAuth({
    baseUrl: env.graphql.origin,
    basePath: '/auth-api',
    trustedOrigins: [env.hiveServices.webApp.url],
    database: pool,
    user: {
      modelName: 'auth_users',
    },
    session: {
      modelName: 'auth_sessions',
    },
    account: {
      modelName: 'auth_accounts',
    },
    verification: {
      modelName: 'auth_verifications',
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: env.auth.requireEmailVerification,
      sendResetPassword: async ({ user, url, token }, request) => {
        console.log({
          to: user.email,
          subject: 'Reset your password',
          text: `Click the link to reset your password: ${url}`,
        });
      },
      password: {
        async hash(password) {
          return hashPassword(password);
        },
        async verify(input) {
          return verifyPassword(input.password, input.hash);
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }, request) => {
        console.log({
          to: user.email,
          subject: 'Verify your email address',
          text: `Click the link to verify your email: ${url}`,
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
      env.organizationOIDC
        ? sso({
            tableName: 'auth_sso',
            logger,
          })
        : undefined,
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
    ].filter((plugin): plugin is ReturnType<typeof sso | typeof genericOAuth> => !!plugin),
    rateLimit: {
      window: 60, // time window in seconds
      max: 100, // max requests in the window
      // KAMIL: create custom rate limits for forget-password and other critical endpoints
    },
    advanced: {
      cookiePrefix: 'hive-auth',
    },
    caching: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // Cache duration in seconds
      },
    },
  });

  // // KAMIL: that is what needed to perform migrations
  // const { runMigrations } = await getMigrations(auth.options);
  // await runMigrations();

  return auth;
}

/**
 * Hashes a plaintext password using bcrypt.
 * This matches SuperTokens' default password hashing behavior.
 * It has to stay consistent with the hashing function used by SuperTokens,
 * so that users migrated from SuperTokens can log in without changing their password.
 */
async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * This allows users migrated from SuperTokens to log in without changing their password.
 */
async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword);
}
