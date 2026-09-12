# `@hive/app`

The Hive application as seen on https://app.graphql-hive.com/.

## Configuration

The following environment variables configure the application.

| Name                                    | Required                                   | Description                                                                                   | Example Value                                        |
| --------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `APP_BASE_URL`                          | **Yes**                                    | The base url of the app,                                                                      | `https://app.graphql-hive.com`                       |
| `GRAPHQL_PUBLIC_ENDPOINT`               | **Yes**                                    | The public endpoint of the Hive GraphQL API.                                                  | `http://127.0.0.1:4000/graphql`                      |
| `GRAPHQL_PUBLIC_ORIGIN`                 | **Yes**                                    | The http address origin of the Hive GraphQL server.                                           | `http://127.0.0.1:4000/`                             |
| `INTEGRATION_SLACK`                     | No                                         | Whether the Slack integration is enabled or disabled.                                         | `1` (enabled) or `0` (disabled)                      |
| `INTEGRATION_SLACK_SLACK_CLIENT_ID`     | No (**Yes** if `INTEGRATION_SLACK` is set) | The Slack client ID.                                                                          | `g6aff8102efda5e1d12e`                               |
| `INTEGRATION_SLACK_SLACK_CLIENT_SECRET` | No (**Yes** if `INTEGRATION_SLACK` is set) | The Slack client secret.                                                                      | `g12e552xx54xx2b127821dc4abc4491dxxxa6b187`          |
| `INTEGRATION_GITHUB_APP_NAME`           | No                                         | The GitHub application name.                                                                  | `graphql-hive-self-hosted`                           |
| `AUTH_GITHUB`                           | No                                         | Whether login via GitHub should be allowed                                                    | `1` (enabled) or `0` (disabled)                      |
| `AUTH_GOOGLE`                           | No                                         | Whether login via Google should be allowed                                                    | `1` (enabled) or `0` (disabled)                      |
| `AUTH_ORGANIZATION_OIDC`                | No                                         | Whether linking a Hive organization to an Open ID Connect provider is allowed. (Default: `0`) | `1` (enabled) or `0` (disabled)                      |
| `AUTH_OKTA`                             | No                                         | Whether login via Okta should be allowed                                                      | `1` (enabled) or `0` (disabled)                      |
| `AUTH_OKTA_HIDDEN`                      | No                                         | Whether the Okta login button should be hidden. (Default: `0`)                                | `1` (enabled) or `0` (disabled)                      |
| `AUTH_REQUIRE_EMAIL_VERIFICATION`       | No                                         | Whether verifying the email address is mandatory.                                             | `1` (enabled) or `0` (disabled)                      |
| `ENVIRONMENT`                           | No                                         | The environment of your Hive app. (**Note:** This will be used for Sentry reporting.)         | `staging`                                            |
| `SENTRY_DSN`                            | No                                         | The DSN for reporting errors to Sentry.                                                       | `https://dooobars@o557896.ingest.sentry.io/12121212` |
| `SENTRY_ENABLED`                        | No                                         | Whether Sentry error reporting should be enabled.                                             | `1` (enabled) or `0` (disabled)                      |
| `DOCS_URL`                              | No                                         | The URL of the Hive Docs                                                                      | `https://the-guild.dev/graphql/hive/docs`            |
| `NODE_ENV`                              | No                                         | The `NODE_ENV` value.                                                                         | `production`                                         |
| `GRAPHQL_PERSISTED_OPERATIONS`          | No                                         | Send persisted operation hashes instead of documents to the server.                           | `1` (enabled) or `0` (disabled)                      |

## Hive Hosted Configuration

This is only important if you are hosting Hive for getting 💰.

### Payments

| Name                | Required | Description            | Example Value          |
| ------------------- | -------- | ---------------------- | ---------------------- |
| `STRIPE_PUBLIC_KEY` | No       | The Stripe Public Key. | `g6aff8102efda5e1d12e` |

### Building the Docker Image

**Prerequisites:** Make sure you built the mono-repository using `pnpm build`.

```bash
docker build . --build-arg RELEASE=stable-main -t graphql-hive/app
```

## Local UI development without a backend

```bash
pnpm dev:mock
```

Asks which scenario to start with, then starts only this app's dev server, hosting a mock GraphQL
API at `/graphql` built from the real API schema
(`packages/services/api/src/modules/*/module.graphql.ts`). No docker, no other services. You are
signed in automatically, every feature flag and permission is on, and every list is populated, so
any gated view can be opened straight away. The last log line tells you the URL.

It loads `src/dev/.env.mock` instead of `.env`, so it behaves the same on every machine. To skip the
prompt (scripts, CI, or a non-interactive shell): `HIVE_MOCK_SCENARIO=empty-org pnpm dev:mock`,
optionally with `HIVE_MOCK_LATENCY=<ms>`.

### Scenarios

A scenario is a named preset for what the fake backend returns. Pick one at the prompt, with
`?scenario=<name>` on any page, or with the switcher in the bottom-right corner. URL and switcher
choices stick in a cookie for the rest of the run; `?scenario=` (empty) goes back to the one you
chose at startup. Cookies from a previous run are ignored, so the prompt always wins on a fresh
start.

| Name                   | What you get                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `default`              | PRO plan, every gate open, realistic data                       |
| `support-with-tickets` | Support page with open and solved tickets and comment threads   |
| `empty-org`            | Fresh organization: no projects, schemas, operations or tickets |
| `over-quota`           | Monthly operations limit exceeded and a failing payment method  |
| `read-only-member`     | A member with no permissions: every `viewerCan*` is false       |
| `logged-out`           | No session, so the sign-in, sign-up and reset pages render      |

Scenarios live in `src/dev/scenarios.ts`; fixtures they use live in `src/dev/fixtures/`.

### Loading and error states

`?latency=2000` delays every response, which is how to see skeletons and debounced spinners.
`?error=<OperationName>|<kind>` (or `*|<kind>`) fails matching operations, where `kind` is
`graphql`, `network` (a non-JSON 503) or `unexpected` (hits that branch of `QueryError`). Both stick
in cookies; `?latency=0` and `?error=` clear them.

### What it is not

Mock data is realistic in shape, not in content: the schema is real, the values are faker. Mutations
return success but nothing persists. Build UI against the mock; verify behaviour on the real stack
(`pnpm dev:hive`) or in e2e. Nothing in mock mode ships to production: it is gated on
`NODE_ENV=development` plus `HIVE_MOCK=1`, and `src/dev/mock-server` is excluded from the server
bundle.
