import { betterAuth } from 'better-auth';
// import { getMigrations } from 'better-auth/db';
import { sso } from 'better-auth/plugins/sso';
import pg from 'pg';
import { env } from '../environment';

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

export const auth = betterAuth({
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
    requireEmailVerification: env.auth.requireEmailVerification,
    sendResetPassword: async ({user, url, token}, request) => {
          console.log({
            to: user.email,
            subject: "Reset your password",
            text: `Click the link to reset your password: ${url}`,
          });
        },
  },
  emailVerification: {
      sendVerificationEmail: async ( { user, url, token }, request) => {
        console.log({
          to: user.email,
          subject: "Verify your email address",
          text: `Click the link to verify your email: ${url}`,
        });
      },
    },
  socialProviders: {
    google: env.auth.google
      ? {
          clientId: env.auth.google.clientId,
          clientSecret: env.auth.google.clientSecret,
        }
      : undefined,
    github: env.auth.github
      ? {
          clientId: env.auth.github.clientId,
          clientSecret: env.auth.github.clientSecret,
        }
      : undefined,
  },
  // KAMIL: creates `ssoProvider` table and there's no way to change it
  plugins: [sso()],
});

// KAMIL: that is what needed to perform migrations
// const { runMigrations } = await getMigrations(auth.options);
// await runMigrations();
