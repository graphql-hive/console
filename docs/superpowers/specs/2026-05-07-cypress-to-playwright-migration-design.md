# Cypress To Playwright Migration Design

## Context

The repository currently runs the console app end-to-end suite through Cypress:

- Root `cypress.config.ts` configures Cypress, test retries, browser viewport, screenshots/videos in CI, and Node tasks backed by `integration-tests/testkit/seed`.
- Root scripts `test:e2e`, `test:e2e:local`, and `test:e2e:open` invoke Cypress.
- `.github/workflows/tests-e2e.yaml` installs the Cypress binary and uses `cypress-io/github-action`.
- E2E tests live in `cypress/e2e` with support code in `cypress/support`.
- The existing suite covers app auth/OIDC flows, usage reporting, and Laboratory behavior.

The requested migration is a full replacement. Cypress should not remain as a parallel runner after the migration is complete.

## Goals

- Replace the root Cypress e2e suite with Playwright.
- Keep Chromium-only browser coverage, matching the current Cypress/Chrome CI behavior.
- Preserve current behavioral coverage while reorganizing tests around Playwright fixtures and helpers.
- Remove Cypress configuration, dependencies, scripts, CI action usage, and artifact paths.
- Keep local and CI workflows equivalent to the current e2e workflow.

## Non-Goals

- Do not expand browser coverage to Firefox or WebKit.
- Do not rewrite application behavior or add new app selectors unless a migrated test cannot be made reliable with existing selectors.
- Do not change the Docker compose e2e environment except where command text or artifact names need to reference Playwright.
- Do not merge the root console app e2e suite with the separate docs Playwright suite.

## Architecture

The new root suite will use Playwright and live under `e2e/`:

```text
e2e/
  fixtures.ts
  helpers/
    app.ts
    auth.ts
    laboratory.ts
    oidc.ts
    usage.ts
  specs/
    app.spec.ts
    usage.spec.ts
    laboratory-preflight.spec.ts
    laboratory-tabs.spec.ts
    laboratory-collections.spec.ts
  local.sh
```

A root `playwright.config.ts` will configure:

- Chromium-only project.
- `baseURL` from `HIVE_APP_BASE_URL`.
- `1280x720` viewport.
- CI retries equivalent to the current Cypress retry behavior.
- Playwright traces, screenshots, and videos on failure.
- CI-friendly reporter output and local HTML report output.
- Environment loading compatible with the current Cypress config:
  - Load `integration-tests/.env` when not running against local services.
  - Load `packages/services/server/.env.template` when `RUN_AGAINST_LOCAL_SERVICES=1`.

The central `e2e/fixtures.ts` file will initialize the same seed bridge currently used by Cypress through `initSeed()` from `integration-tests/testkit/seed`. Tests will call typed fixture methods instead of `cy.task`.

## Fixtures And Helpers

The Playwright suite will use explicit `async/await` and typed fixtures.

### Seed Fixture

Expose seed operations currently implemented as Cypress tasks:

- `seed.seedOrg()`
- `seed.seedTarget()`
- `seed.getEmailConfirmationLink(input)`
- `seed.purgeOIDCDomains()`
- `seed.forgeOIDCDNSChallenge(orgSlug)`

### Auth Helper

Responsibilities:

- Generate random users and credentials.
- Fill and submit sign-in and sign-up forms.
- Sign up through the email verification flow.
- Log in through the email/password flow.
- Clear cookies, local storage, and session storage.
- Set `sRefreshToken` for seeded users.

### App Helper

Responsibilities:

- Generate random slugs.
- Create an organization through the UI.
- Create a project through the UI.
- Wait for organization, project, and target picker state.

### OIDC Helper

Responsibilities:

- Create an OIDC integration through the UI.
- Return `{ loginUrl, organizationSlug }`.
- Perform mock OIDC login for known users.
- Complete OIDC email verification through the seed fixture.
- Support invitation-required and domain-verification flows.

### Laboratory Helper

Responsibilities:

- Set `hive:laboratory:type` to `graphiql` before navigation.
- Manipulate CodeMirror editor state.
- Manipulate Monaco editor state with browser-side APIs.
- Open, close, and assert GraphiQL tabs.
- Open the Operation Collections panel deterministically.
- Interact with preflight controls and logs.

### Usage Helper

Responsibilities:

- Create registry access tokens through the UI.
- Send usage reports through Playwright's request context unless browser-origin execution is required.
- Assert Insights visibility for operation and client/version data.

## Coverage

The migrated suite must preserve the existing behavioral coverage.

### App And Auth

- Basic app visit.
- Anonymous redirect to sign-in.
- User signup.
- User login.
- Login and logout.
- Organization creation.

### OIDC

- OIDC login for organization via link.
- OIDC login with organization slug input.
- First-time OIDC login of a non-admin user.
- Default member role for first-time OIDC login.
- Email/password account linking with an existing OIDC user.
- Invalid OIDC URL error state.
- Invitation-required denial.
- Invitation-required success.
- OIDC domain verification without email verification.

### Usage Reporting

- Usage report is visible in Insights for a named client.
- Usage report is visible in Insights for an `unknown` client.
- Usage report is visible in Insights for a missing client name.
- Usage reports with missing and `unknown` client names are visible together.

### Laboratory Preflight

- Laboratory loads when the environment local storage value is `{}`.
- Mini preflight editor is read-only.
- Script and environment values persist after save and reload.
- Console, warning, and error logs are shown.
- Prompt values are awaited and logged.
- Prompt cancellation returns `null`.
- Script execution updates environment variables.
- `crypto-js` hashing works in scripts.
- Preflight request headers are added.
- Preflight request headers take precedence over base headers.
- Preflight headers are not substituted before environment substitution rules apply.
- Header placeholders are substituted from environment variables.
- Executed scripts update environment and substituted headers.
- Prompted values can be used in headers.
- Disabled scripts are not executed.
- Logs are visible when opened.
- Logs can be cleared.

### Laboratory Tabs

- Deleting the last tab resets state to defaults.

### Laboratory Collections

- Create a collection and operation.
- Edit collection name.
- Delete collection.
- Edit operation name.
- Delete operation.
- Visiting a copied operation link opens the correct operation.

## Migration Rules

- Prefer Playwright locators based on role, text, labels, and existing `data-cy` attributes.
- Keep existing `data-cy` selectors where they reduce risk or avoid unrelated app changes.
- Avoid fixed waits when Playwright can wait on locator state, URL, response, or assertion.
- Keep the current usage-ingestion delay only if no reliable UI or backend readiness signal exists.
- Use typed helper return values instead of Cypress aliases.
- Start with strict Playwright page-error behavior. Suppress browser exceptions only if a failure matches noise currently ignored by `Cypress.on('uncaught:exception', () => false)`.
- Keep specs grouped by feature, but make individual tests read as Playwright-native behavior instead of Cypress command chains.

## Scripts

Root scripts will become:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:local": "RUN_AGAINST_LOCAL_SERVICES=1 HIVE_APP_BASE_URL=http://localhost:3000 playwright test --ui",
  "test:e2e:open": "playwright test --ui"
}
```

The lint script will include the new `e2e` directory instead of the removed `cypress` directory.

## CI

`.github/workflows/tests-e2e.yaml` will keep the Docker compose setup unchanged and replace Cypress-specific steps:

- Replace `pnpm cypress install` with `pnpm exec playwright install chromium --with-deps`.
- Replace `cypress-io/github-action` with a direct `pnpm test:e2e` run.
- Keep `CI=true`.
- Upload Playwright artifacts on failure:
  - `playwright-report/`
  - `test-results/`

The PR workflow can keep calling `.github/workflows/tests-e2e.yaml`; only comments that explicitly mention Cypress should be updated to Playwright.

## Cleanup

Remove:

- `cypress.config.ts`
- `cypress/`
- Root `cypress` dev dependency.
- Root `eslint-plugin-cypress` dev dependency.
- Cypress install step, Cypress GitHub Action usage, and Cypress artifact paths.

Add:

- Root `@playwright/test` dev dependency.
- Root `playwright.config.ts`.
- Root `e2e/` suite and helper structure.
- `e2e/local.sh`, replacing `cypress/local.sh` with equivalent Docker setup instructions and Playwright commands.

Update:

- `docs/TESTING.md` E2E section to describe Playwright.
- Root lint glob to include `e2e`.
- CI artifact names and paths.

## Verification

The implementation plan should verify the migration with:

- `pnpm lint` or the narrowest available lint command covering `e2e`.
- TypeScript validation for the Playwright suite.
- `pnpm test:e2e` against the Docker e2e environment when available.
- At minimum, `pnpm exec playwright test --list` if the full environment is not running.

## Open Decisions

No open product or scope decisions remain. The migration target is a full replacement, Chromium-only, with reorganized Playwright fixtures and helpers.
