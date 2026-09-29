/**
 * Stand-in for `@/env/frontend`, which validates `window.__ENV` at import time. Specs opt in with
 * `vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'))`. Sentry is on so a spec can
 * tell whether anything initialized it.
 */
export const env: typeof import('@/env/frontend').env = {
  appBaseUrl: 'http://localhost:3000',
  graphqlPublicEndpoint: 'http://localhost:3001/graphql',
  graphqlPublicSubscriptionEndpoint: 'http://localhost:3001/graphql',
  graphqlPublicOrigin: 'http://localhost:3001',
  docsUrl: 'https://the-guild.dev/graphql/hive/docs',
  stripePublicKey: null,
  auth: {
    github: false,
    google: false,
    okta: null,
    requireEmailVerification: false,
    oidc: false,
  },
  integrations: {
    slack: false,
  },
  sentry: { dsn: 'https://public@sentry.example/1' },
  release: 'test',
  environment: 'test',
  nodeEnv: 'test',
  graphql: {
    persistedOperationsPrefix: null,
  },
  zendeskSupport: false,
  migrations: {
    member_roles_deadline: null,
  },
};
