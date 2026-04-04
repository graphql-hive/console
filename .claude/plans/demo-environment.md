# Demo Environment for GraphQL Hive Console (`demo.graphql-hive.com`)

## Context

Create a pre-seeded, publicly accessible demo at `demo.graphql-hive.com` where visitors can explore the full Hive console with realistic data. Visitors auto-login with full write access and can try all features. Data resets periodically to stay fresh.

---

## Decisions

- **Auth:** Auto-login via session injection middleware (zero friction)
- **Access:** Full write access (Admin role) — visitors can create, modify, delete
- **Data:** Multiple showcase projects (monolith, federation, contracts/proposals)
- **Infra:** New `demo` Pulumi environment, fully isolated

---

## Step-by-Step Implementation

### Step 1: Demo Seed Script (`scripts/seed-demo.mts`)

Write a comprehensive seed script that creates a compelling demo environment. Base it on the existing `scripts/seed-insights.mts` pattern.

**Demo data to create:**

1. **Owner account** — `demo@graphql-hive.com` / known password
2. **Organization** — "Acme Corp" (`acme-corp`)
3. **Project 1: "E-Commerce API"** (Single schema)
   - Targets: `development`, `staging`, `production`
   - Schema: Products, Orders, Users, Payments types
   - Multiple schema versions (publish 3-5 times to show history with some breaking changes)
   - 30 days of usage data across multiple clients (web-app, ios, android, admin-dashboard)
   - Alert channels (webhook)
   - Saved filters for insights
   - Document collections in Laboratory

4. **Project 2: "Platform Gateway"** (Federation)
   - Targets: `development`, `production`
   - Subgraph services: users, products, inventory, reviews, notifications
   - Schema files already exist at `scripts/seed-schemas/federated/`
   - Usage data showing per-subgraph operation patterns
   - App deployments seeded

5. **Project 3: "Mobile BFF"** (Single schema with contracts/proposals)
   - Target: `production`
   - Schema with a pending proposal showing the proposals workflow
   - Contracts configured if feature flag supports it

**Key files to reference/reuse:**
- `scripts/seed-insights.mts` — auth helpers, usage data generation pattern
- `scripts/seed-schemas.ts` — schema publishing pattern
- `scripts/seed-app-deployments.mts` — app deployment seeding
- `integration-tests/testkit/seed.ts` — `initSeed()` and all entity creation utilities
- `integration-tests/testkit/flow.ts` — GraphQL operation helpers (createOrganization, createProject, publishSchema, etc.)
- `scripts/seed-schemas/federated/` — existing federation schema files

**Pain points:**
- Usage data ingestion takes ~15s (flows through Kafka → ClickHouse pipeline). Script must wait.
- Multiple schema publishes need sequential execution (each depends on the previous version).
- Federation composition must succeed — schema files need to be compatible.

---

### Step 2: Auto-Login Route

Add a Fastify route that creates a demo session and redirects to the dashboard.

**Architecture context:** The web app uses Vite + Fastify (`@fastify/vite`) with TanStack Router. The Fastify server has **no auth middleware** — it's a transparent proxy that forwards cookies to the GraphQL API. Auth is entirely client-side (SuperTokens React SDK) + API-side. Existing API routes follow the `/api/*` convention (`/api/health`, `/api/github/callback`, `/api/slack/callback`).

**Approach:** Add a `/api/demo-login` Fastify route that:
1. Only registers when `ENVIRONMENT === 'demo'` (route doesn't exist in other environments)
2. Uses SuperTokens `Session.createNewSession()` to create a session programmatically for the demo user — this is the SuperTokens-blessed API for server-side session creation, no sign-in flow needed
3. Cookies are automatically set on the response by SuperTokens
4. Redirects to `/acme-corp` (or a `redirectToPath` query param)

**Client-side redirect:** On the frontend, when `ENVIRONMENT === 'demo'` and `Session.doesSessionExist()` returns false, redirect to `/api/demo-login`. This matches the existing pattern where unauthenticated users get redirected to `/auth?redirectToPath=...`.

**Key files to modify:**
- `packages/web/app/src/server/` — add `demo-login.ts` route (follows pattern of `github.ts`, `slack.ts`)
- `packages/web/app/src/server/index.ts` — register the route conditionally on `ENVIRONMENT === 'demo'`
- Client-side: update the auth redirect logic to point to `/api/demo-login` in demo mode

**Key files to reference:**
- `packages/web/app/src/server/github.ts` — existing route pattern with redirects and cookie handling
- `packages/web/app/src/lib/urql.ts` — `UNAUTHENTICATED` error handling and redirect logic
- `packages/web/app/src/config/supertokens/frontend.ts` — client-side SuperTokens config
- SuperTokens docs: `Session.createNewSession(req, res, "public", recipeUserId)` API

**Pain points:**
- The demo user must exist in the SuperTokens database before `createNewSession()` can reference their user ID. The seed script (Step 1) must run first.
- SuperTokens session tokens have expiry. The existing client-side refresh flow (`Session.attemptRefreshingSession()`) should handle this automatically.
- If the demo user gets deleted (full write access!), auto-login breaks. The periodic reset (Step 4) restores it.
- The `/api/demo-login` route must be gated to demo environment only — it must never exist in production.

---

### Step 3: Demo Mode UI Enhancements

Add demo-specific UI elements conditioned on `ENVIRONMENT === 'demo'`.

**3a. Demo Banner**
- Persistent top banner: "You're exploring a demo. Data resets periodically. [Sign up for free →](https://app.graphql-hive.com)"
- Add to the main layout component
- Files: `packages/web/app/src/components/layouts/` (find the root layout)

**3b. CTA Overlays**
- When users perform actions (create org, publish schema, etc.), show a subtle "Enjoying Hive? Sign up for your own workspace" prompt
- Optional — can be added in a later iteration

**3c. Hide/Modify Auth Pages**
- In demo mode, hide the signup/login pages (users are auto-logged in)
- Redirect `/auth/*` routes to the dashboard
- Hide "Sign out" or make it redirect back to auto-login

**Pain point:** The `ENVIRONMENT` variable is already exposed to the frontend via `packages/web/app/src/env/frontend.ts`, so conditional rendering is straightforward.

---

### Step 4: Periodic Data Reset

Since visitors have full write access, data will drift. Implement periodic reset.

**Approach: Cron job (Kubernetes CronJob)**

1. Create a Kubernetes CronJob in the Pulumi demo environment
2. Schedule: Every 6 hours (or configurable)
3. Job steps:
   a. Wipe PostgreSQL (run existing `db-cleanup.sql` pattern from `deployment/services/database-cleanup.ts`)
   b. Wipe ClickHouse tables
   c. Run migrations (`MIGRATOR=up`)
   d. Run `seed-demo.mts`

**Key files:**
- `deployment/services/database-cleanup.ts` — existing cleanup job (currently blocked for prod, enable for demo)
- `packages/migrations/` — migration runner

**Alternative: Snapshot restore**
Instead of re-seeding (which takes minutes due to usage ingestion), snapshot the databases after initial seed and restore from snapshots. Faster but more ops complexity.

**Pain points:**
- During reset (~2-3 min), the demo is in a broken state. Options:
  - Show a "Demo is refreshing, please wait" page during reset
  - Use blue-green: seed into a parallel DB, then swap connections
- Active user sessions will break on reset (SuperTokens sessions reference user IDs that get wiped)
- ClickHouse usage data ingestion delay means insights page may be empty for ~15s after reset

---

### Step 5: Pulumi Environment Configuration

Add `demo` environment to the deployment infrastructure.

**Files to modify:**
- `deployment/services/environment.ts` — add `isDemo` flag:
  ```typescript
  const isDemo = env === 'demo';
  ```
- `deployment/index.ts` — wire up demo-specific config

**Environment variables for demo:**
```
ENVIRONMENT=demo
APP_BASE_URL=https://demo.graphql-hive.com
GRAPHQL_PUBLIC_ENDPOINT=https://demo-api.graphql-hive.com/graphql
GRAPHQL_PUBLIC_ORIGIN=https://demo-api.graphql-hive.com

# Auth
AUTH_REQUIRE_EMAIL_VERIFICATION=0
AUTH_GITHUB=0
AUTH_GOOGLE=0
AUTH_OKTA=0
AUTH_ORGANIZATION_OIDC=0

# Demo user credentials (used by auto-login + seed script)
DEMO_USER_EMAIL=demo@graphql-hive.com
DEMO_USER_PASSWORD=<generated-secret>

# Disable billing
COMMERCE_BILLING=0

# Disable external integrations
INTEGRATION_SLACK=0

# Enable all feature flags
FEATURE_FLAGS_APP_DEPLOYMENTS_ENABLED=1
FEATURE_FLAGS_SCHEMA_PROPOSALS_ENABLED=1
FEATURE_FLAGS_OTEL_TRACING_ENABLED=1
```

**Resource sizing:** Similar to `dev` — 1 replica per service, minimal resource requests.

**DNS:** `demo.graphql-hive.com` → demo cluster ingress

**Infrastructure notes:**
- Databases (PostgreSQL, ClickHouse, Kafka) are provisioned externally, not by Pulumi. Need separate DB instances or databases.
- Only Redis is deployed within K8s by Pulumi.
- Networking uses Contour (Envoy-based ingress). Routes configured in `deployment/utils/reverse-proxy.ts`.
- Docker images are built on push to main, tagged with commit SHA, pushed to ghcr.io.
- Deployment is triggered via GitHub Actions dispatch to a private deployment repo.
- Each Pulumi stack is fully isolated with its own `Pulumi.<env>.yaml` config file containing all secrets.

---

### Step 6: Guard Against Catastrophic Actions

With full write access, visitors could delete the entire organization. Add demo-specific guards.

**Option A: Mutation-level guards (Recommended)**
In the API server, for demo environment, block specific destructive mutations:
- `deleteOrganization` — block entirely
- `leaveOrganization` — block (would orphan the org)
- `deleteProject` — allow (gets restored on reset)
- `deleteTarget` — allow

Add a check in the relevant resolvers:
```typescript
if (injector.get(Environment).environment === 'demo') {
  throw new HiveError('This action is disabled in the demo environment');
}
```

**Files:**
- `packages/services/api/src/modules/organization/resolvers/Mutation/deleteOrganization.ts`
- `packages/services/api/src/modules/auth/resolvers/Mutation/leaveOrganization.ts`

**Option B: Read-only org flag in DB**
Add a `demo_protected` boolean to the organizations table. More robust but requires a migration.

---

## Verification Plan

1. **Local testing:** Run `seed-demo.mts` against local dev environment, verify all data appears correctly in the UI
2. **Auto-login:** Test the middleware by clearing cookies and visiting the demo URL — should land on dashboard
3. **Write access:** Test creating a project, publishing a schema, running a schema check
4. **Destructive guards:** Try deleting the org — should be blocked
5. **Data reset:** Run the reset job, verify the demo returns to clean state
6. **E2E:** Deploy to demo Pulumi environment, test full flow including DNS resolution

---

## Effort Estimate Summary

| Step | Complexity | Notes |
|------|-----------|-------|
| 1. Seed script | Medium-High | Most work — need realistic schemas, multiple projects, usage data |
| 2. Auto-login middleware | Medium | New code, but contained. ~100 lines. |
| 3. Demo UI (banner, redirects) | Low | Conditional rendering based on env var |
| 4. Periodic reset | Medium | K8s CronJob + handling the reset window |
| 5. Pulumi environment | Low | Pattern already exists for other environments |
| 6. Destructive guards | Low | A few if-checks in resolvers |

**Suggested order:** 1 → 5 → 2 → 6 → 3 → 4 (seed script first to validate data, infra next, then polish)
