# Alerts & Notifications Improvement Proposal

## Motivation

The existing alerts system only supports schema change notifications via Slack, Webhook, and MS
Teams. Users have no way to be alerted when their GraphQL API's latency spikes, error rate degrades,
or traffic volume changes unexpectedly. These are the most valuable alert types from a production
monitoring perspective.

We also lack email as a notification channel, which is table stakes for an alerting system.

This proposal covers two workstreams:

1. **Metric-based alerts** — Add configurable alerts for latency, error rate, and traffic with
   periodic evaluation against ClickHouse data
2. **Email alert channel** — Add EMAIL as a new notification channel type, benefiting both existing
   schema-change alerts and the new metric alerts (deferred until after Phase 1 ships; design
   decisions around team-member vs. group-email handling are still being finalized)

### Design decisions made so far

- **Resolved notifications**: Send a "resolved" notification when a metric alert transitions from
  FIRING through RECOVERING back to NORMAL
- **Alert scoping**: Metric alerts can optionally be scoped to a specific insights filter (operation
  IDs and/or client name+version combinations)
- **Multiple email recipients**: Email channels support an array of addresses
- **Severity levels**: Alerts carry a user-defined severity label (info, warning, critical) for
  organizational purposes
- **Four-state alert lifecycle**: Alerts transition through NORMAL → PENDING → FIRING → RECOVERING
  → NORMAL. The pending and recovering states require the condition to hold for a configurable
  number of consecutive minutes (`confirmation_minutes`) before escalating or resolving, preventing
  flapping (rapid normal→firing→normal→firing cycles). All four states are user-facing.

---

## Pre-flight review (pre-implementation validation)

The plan was reviewed against the current codebase on 2026-04-15. The following items were
validated and are reflected in the sections below. Anything an implementer should double-check
before their first commit is called out explicitly.

**Validated as matching current conventions:**

- Migration file naming (`YYYY.MM.DDTHH-MM-SS.description.ts`) and registration via
  `await import()` in `run-pg-migrations.ts`.
- `MigrationExecutor` interface supports `noTransaction: true` — correct for the Phase 2
  `ALTER TYPE ... ADD VALUE` migration.
- `uuid_generate_v4()` is the default-UUID convention (not `gen_random_uuid()`). Adjusted
  throughout.
- `saved_filters` table exists (migration `2026.02.07T00-00-00.saved-filters.ts`) with
  `id UUID`, `project_id UUID`, `filters JSONB`. FK from `metric_alert_rules.saved_filter_id`
  is safe.
- `alert:modify` permission exists at
  `packages/services/api/src/modules/auth/lib/authz.ts` (~line 405) and is already used by the
  existing `AlertsManager`. Reused for metric alert rules — no new permission needed.
- Mutation result shape (`{ ok, error }` discriminated union) matches
  `saved-filters/resolvers/Mutation/createSavedFilter.ts`.
- Module-level storage providers with `@Inject(PG_POOL_CONFIG)` are the modern pattern
  (saved-filters, proposals, oidc-integrations all follow it). Legacy
  `packages/services/storage/src/index.ts` is intentionally not extended.
- Graphile-Worker cron deduplication is automatic — an overrunning evaluation task will not
  spawn a concurrent instance on the next tick.
- `send-webhook.ts` in workflows already uses `got` + retries; reusable for metric-alert
  webhook delivery with zero infrastructure changes.
- Email provider abstraction (`context.email.send({ to, subject, body })`) in workflows is
  reusable for Phase 2 email delivery.

**Gaps the implementer must close during Phase 1:**

1. **Add `@slack/web-api` to `packages/services/workflows/package.json`.** Currently only the
   API package has it. Pin to the same version as the API package for parity.
2. **Cross-scope validation in mutation resolvers.** The FKs on `metric_alert_rules` cannot
   enforce that all `channelIds` and the `saved_filter_id` belong to the same project as the
   rule's target. Explicit validation in `addMetricAlertRule` / `updateMetricAlertRule` is
   required. See section 1.3 for details.
3. **Regenerate GraphQL types.** Run `pnpm graphql:generate` from repo root after schema edits.
   Generated files appear in `packages/services/api/src/__generated__/types.ts` and each
   module's `resolvers.generated.ts` — do not hand-edit.
4. **Add `alertStateLogRetentionDays` to commerce plan constants.** The retention column on
   `metric_alert_state_log` uses per-plan values (7d Hobby/Pro, 30d Enterprise) driven from
   `packages/services/api/src/modules/commerce/constants.ts`.

---

## Phase 1: Metric-Based Alerts

### Why a new table?

The existing `alerts` table is tightly coupled to schema-change notifications — it has a fixed
`alert_type` enum with only `SCHEMA_CHANGE_NOTIFICATIONS`, and no configuration columns. Metric
alerts need substantially different configuration: time windows, metric selectors, threshold
types/values, comparison direction, severity, evaluation state, and optional operation/client
filters.

A new `metric_alert_rules` table keeps both systems clean and independently evolvable. It reuses the
existing `alert_channels` table (Slack, Webhook, MS Teams) for notification delivery. EMAIL support
will be added in Phase 2.

### Conventions to follow (validated against codebase)

These were verified during a final pre-implementation review against current patterns in the repo.

- **Migration filename format**: `YYYY.MM.DDTHH-MM-SS.description.ts` (matches latest migrations
  like `2026.03.25T00-00-00.access-token-expiration.ts`).
- **Migration registration**: Use the dynamic `await import('./actions/...')` pattern in
  `packages/migrations/src/run-pg-migrations.ts` (the convention adopted post-Dec 2024). Static
  imports exist in older entries but new migrations should use the async form.
- **UUID defaults**: Use `uuid_generate_v4()` (the existing convention) — not `gen_random_uuid()`.
  The uuid extension is enabled in the base schema migration.
- **Timestamp columns**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and an
  `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` are present on most modern tables. Apply this
  to `metric_alert_rules` (we already have `created_at`; add `updated_at`).
- **Module-level data access**: Inject `PG_POOL_CONFIG` directly via `@Inject(PG_POOL_CONFIG)
  private pool: DatabasePool` in an `@Injectable({ scope: Scope.Operation })` class. Mirror the
  shape of `packages/services/api/src/modules/saved-filters/providers/saved-filters-storage.ts`.
  Do NOT extend the legacy `packages/services/storage/src/index.ts`.
- **Permissions**: Reuse the existing `alert:modify` action (`packages/services/api/src/modules/auth/lib/authz.ts`
  ~line 405) for both reads and writes of metric alert rules, matching how the existing
  `AlertsManager` handles channels and schema-change alerts. Do not introduce a new `alert:read`
  permission — that would expand authz scope unnecessarily.
- **Mutation result shape**: Use the discriminated `{ ok: { ... } } | { error: { message } }`
  pattern as shown in `packages/services/api/src/modules/saved-filters/resolvers/Mutation/createSavedFilter.ts`.
- **Connection pattern**: Mirror `SavedFilterConnection` for `MetricAlertRuleIncidentConnection`
  and any other paginated connections.
- **GraphQL codegen**: Run `pnpm graphql:generate` from repo root after schema edits. Generated
  resolver types appear under `packages/services/api/src/__generated__/types.ts` and module
  `resolvers.generated.ts` files (do NOT hand-edit those).
- **GraphQL mappers**: Add `MetricAlertRuleMapper`, `MetricAlertRuleIncidentMapper`,
  `MetricAlertRuleStateChangeMapper` to `packages/services/api/src/modules/alerts/module.graphql.mappers.ts`,
  pointing at internal entity types defined in `packages/services/api/src/shared/entities.ts`.

### 1.1 Database Migration

**New file:** `packages/migrations/src/actions/2026.04.15T00-00-01.metric-alert-rules.ts`

```sql
CREATE TYPE metric_alert_type AS ENUM('LATENCY', 'ERROR_RATE', 'TRAFFIC');

CREATE TYPE metric_alert_metric AS ENUM('avg', 'p75', 'p90', 'p95', 'p99');

CREATE TYPE metric_alert_threshold_type AS ENUM('FIXED_VALUE', 'PERCENTAGE_CHANGE');

CREATE TYPE metric_alert_direction AS ENUM('ABOVE', 'BELOW');

CREATE TYPE metric_alert_severity AS ENUM('INFO', 'WARNING', 'CRITICAL');

CREATE TYPE metric_alert_state AS ENUM('NORMAL', 'PENDING', 'FIRING', 'RECOVERING');

-- Alert configuration (what to monitor and how)
CREATE TABLE metric_alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES targets (id) ON DELETE CASCADE,
  type metric_alert_type NOT NULL,
  time_window_minutes INT NOT NULL DEFAULT 30,
  metric metric_alert_metric, -- only for LATENCY type
  threshold_type metric_alert_threshold_type NOT NULL,
  threshold_value DOUBLE PRECISION NOT NULL,
  direction metric_alert_direction NOT NULL DEFAULT 'ABOVE',
  severity metric_alert_severity NOT NULL DEFAULT 'WARNING',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_evaluated_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,           -- denormalized; updated on PENDING → FIRING transitions
  -- Alert state machine
  state metric_alert_state NOT NULL DEFAULT 'NORMAL',
  state_changed_at TIMESTAMPTZ,            -- when the current state began
  -- How many consecutive minutes the condition must hold before
  -- PENDING → FIRING or RECOVERING → NORMAL (prevents flapping)
  confirmation_minutes INT NOT NULL DEFAULT 5,
  -- Optional insights filter scoping. References a saved filter by ID; the UI picks a saved
  -- filter by name (see packages/services/api/src/modules/saved-filters/). If the saved filter
  -- is later edited, the rule automatically uses the updated filter contents at evaluation time.
  -- If the saved filter is deleted, the rule becomes unscoped (applies to the whole target).
  --
  -- IMPORTANT: saved_filters are project-scoped (saved_filters.project_id), not target-scoped.
  -- The addMetricAlertRule / updateMetricAlertRule resolvers MUST validate
  -- `savedFilter.projectId === target.projectId` before writing, since the FK alone cannot
  -- enforce this cross-column invariant. See the pattern used in
  -- packages/services/api/src/modules/saved-filters/providers/saved-filters.provider.ts
  -- around the `projectId !== target.projectId` check.
  saved_filter_id UUID REFERENCES saved_filters (id) ON DELETE SET NULL,
  CONSTRAINT metric_alert_rules_metric_required CHECK (
    (
      type = 'LATENCY'
      AND metric IS NOT NULL
    )
    OR (
      type != 'LATENCY'
      AND metric IS NULL
    )
  )
);

CREATE INDEX idx_metric_alert_rules_enabled ON metric_alert_rules (enabled)
WHERE
  enabled = TRUE;

-- Many-to-many: each rule can notify multiple channels; each channel can serve multiple rules.
-- Matches the UI where users add multiple destinations per alert (e.g. Slack #alerts + Email).
CREATE TABLE metric_alert_rule_channels (
  metric_alert_rule_id UUID NOT NULL REFERENCES metric_alert_rules (id) ON DELETE CASCADE,
  alert_channel_id UUID NOT NULL REFERENCES alert_channels (id) ON DELETE CASCADE,
  PRIMARY KEY (metric_alert_rule_id, alert_channel_id)
);

CREATE INDEX idx_marc_channel ON metric_alert_rule_channels (alert_channel_id);

-- Alert incident history (each time an alert fires and resolves)
CREATE TABLE metric_alert_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  metric_alert_rule_id UUID NOT NULL REFERENCES metric_alert_rules (id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ, -- NULL while still firing
  current_value DOUBLE PRECISION NOT NULL,
  previous_value DOUBLE PRECISION,
  threshold_value DOUBLE PRECISION NOT NULL -- snapshot of threshold at time of incident
);

CREATE INDEX idx_metric_alert_incidents_alert ON metric_alert_incidents (metric_alert_rule_id);

CREATE INDEX idx_metric_alert_incidents_open ON metric_alert_incidents (metric_alert_rule_id)
WHERE
  resolved_at IS NULL;

-- State transition log (powers alert history UI: event list, bar chart, state timeline)
-- Retention: 7 days for Hobby/Pro, 30 days for Enterprise (set at insert time via expires_at)
CREATE TABLE metric_alert_state_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  metric_alert_rule_id UUID NOT NULL REFERENCES metric_alert_rules (id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES targets (id) ON DELETE CASCADE,
  from_state metric_alert_state NOT NULL,
  to_state metric_alert_state NOT NULL,
  -- Value snapshot at the time of transition (for historical accuracy even if rule changes)
  value DOUBLE PRECISION,                  -- current window's metric value
  previous_value DOUBLE PRECISION,         -- previous window's metric value
  threshold_value DOUBLE PRECISION,        -- snapshot of rule.threshold_value at transition time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL          -- set based on org plan at insert time
);

CREATE INDEX idx_metric_alert_state_log_rule ON metric_alert_state_log (metric_alert_rule_id, created_at);
CREATE INDEX idx_metric_alert_state_log_target ON metric_alert_state_log (target_id, created_at);
CREATE INDEX idx_metric_alert_state_log_expires ON metric_alert_state_log (expires_at);
```

### 1.2 Data Access

**New file:** `packages/services/api/src/modules/alerts/providers/metric-alert-rules-storage.ts`

Module-level provider with direct `PG_POOL_CONFIG` injection (the modern pattern used by recent
modules like app-deployments, schema-proposals, saved-filters — not the legacy storage service).
Provides:

Alert configuration CRUD:

- `addMetricAlertRule(input)`, `updateMetricAlertRule(id, fields)`, `deleteMetricAlertRules(ids)`
- `getMetricAlertRules(projectId)`, `getMetricAlertRulesByTarget(targetId)`
- `getAllEnabledMetricAlertRules()` — used by the workflows evaluation task; returns rules joined
  with their channels (via `metric_alert_rule_channels`), saved filter contents (via
  `saved_filters.id`), target, project, organization

Channel management (multi-destination):

- `setRuleChannels(ruleId, channelIds[])` — replaces the full set of channels attached to a rule
  (called from add/update mutations)
- `getRuleChannels(ruleId)` — all channels attached to a rule

Incident management:

- `createIncident(ruleId, currentValue, previousValue, thresholdValue)` — called when rule
  transitions PENDING → FIRING
- `resolveIncident(ruleId)` — sets `resolved_at` on the open incident when rule transitions
  RECOVERING → NORMAL
- `getOpenIncident(ruleId)` — find currently firing incident (where `resolved_at IS NULL`)
- `getIncidentHistory(ruleId, limit, offset)` — paginated history for the UI

State log (powers alert history UI):

- `logStateTransition(ruleId, targetId, fromState, toState, value, previousValue, thresholdValue, expiresAt)` —
  called on every state transition during evaluation. `thresholdValue` is snapshotted from the rule
  at transition time so historical events remain accurate even if the rule is later edited.
  `expiresAt` is computed from the org's plan: `NOW() + 7 days` for Hobby/Pro, `NOW() + 30 days`
  for Enterprise.
- `getStateLog(ruleId, from, to)` — state changes for a single alert rule within a time range
- `getStateLogByTarget(targetId, from, to)` — all state changes across all rules for a target

### 1.3 GraphQL API

**File:** `packages/services/api/src/modules/alerts/module.graphql.ts`

```graphql
enum MetricAlertRuleType {
  LATENCY
  ERROR_RATE
  TRAFFIC
}
enum MetricAlertRuleMetric {
  avg
  p75
  p90
  p95
  p99
}
enum MetricAlertRuleThresholdType {
  FIXED_VALUE
  PERCENTAGE_CHANGE
}
enum MetricAlertRuleDirection {
  ABOVE
  BELOW
}
enum MetricAlertRuleSeverity {
  INFO
  WARNING
  CRITICAL
}
enum MetricAlertRuleState {
  NORMAL
  PENDING
  FIRING
  RECOVERING
}

type MetricAlertRule {
  id: ID!
  name: String!
  type: MetricAlertRuleType!
  target: Target!
  """
  Destinations that receive notifications when this rule fires or resolves.
  Backed by the metric_alert_rule_channels join table.
  """
  channels: [AlertChannel!]!
  timeWindowMinutes: Int!
  metric: MetricAlertRuleMetric
  thresholdType: MetricAlertRuleThresholdType!
  thresholdValue: Float!
  direction: MetricAlertRuleDirection!
  severity: MetricAlertRuleSeverity!
  state: MetricAlertRuleState!
  confirmationMinutes: Int!
  enabled: Boolean!
  lastEvaluatedAt: DateTime
  """Most recent time this rule transitioned PENDING → FIRING (null if never fired)"""
  lastTriggeredAt: DateTime
  createdAt: DateTime!
  """
  The saved filter that scopes this rule (null = applies to the whole target).
  """
  savedFilter: SavedFilter
  """
  Count of state transitions logged for this rule in the given time range.
  Powers the "Events" column on the alert rules list.
  """
  eventCount(from: DateTime!, to: DateTime!): Int!
  """
  The currently open incident, if any
  """
  currentIncident: MetricAlertRuleIncident
  """
  Past incidents for this alert
  """
  incidents(first: Int, after: String): MetricAlertRuleIncidentConnection!
}

type MetricAlertRuleIncident {
  id: ID!
  startedAt: DateTime!
  resolvedAt: DateTime
  currentValue: Float!
  previousValue: Float
  thresholdValue: Float!
}

type MetricAlertRuleStateChange {
  id: ID!
  fromState: MetricAlertRuleState!
  toState: MetricAlertRuleState!
  """Metric value in the current window at transition time"""
  value: Float
  """Metric value in the previous (comparison) window at transition time"""
  previousValue: Float
  """Threshold value snapshotted at transition time (survives rule edits)"""
  thresholdValue: Float
  createdAt: DateTime!
  rule: MetricAlertRule!
}

extend type MetricAlertRule {
  """State change history for this rule (powers the state timeline)"""
  stateLog(from: DateTime!, to: DateTime!): [MetricAlertRuleStateChange!]!
}

extend type Target {
  """State changes across all alert rules for this target (powers the alert events chart + list)"""
  metricAlertRuleStateLog(from: DateTime!, to: DateTime!): [MetricAlertRuleStateChange!]!
}

extend type Project {
  metricAlertRules: [MetricAlertRule!]
}

# Mutations (standard ok/error result pattern):
# - addMetricAlertRule(input: AddMetricAlertRuleInput!)
# - updateMetricAlertRule(input: UpdateMetricAlertRuleInput!)
# - deleteMetricAlertRules(input: DeleteMetricAlertRulesInput!)
#
# AddMetricAlertRuleInput / UpdateMetricAlertRuleInput include:
#   channelIds: [ID!]!           # attach one or more channels (multi-destination)
#   savedFilterId: ID            # optional FK to a saved filter
#   confirmationMinutes: Int     # defaults to 5; UI defaults to 0 for long windows
```

**New resolver files:** `MetricAlertRule.ts`, `MetricAlertRuleIncident.ts`,
`MetricAlertRuleIncidentConnection.ts`, `MetricAlertRuleStateChange.ts`,
`Mutation/addMetricAlertRule.ts`, `Mutation/updateMetricAlertRule.ts`,
`Mutation/deleteMetricAlertRules.ts`.

Uses `alert:modify` permission for both reads and writes (no separate `alert:read` exists; this
matches how the existing `AlertsManager` handles schema-change alerts).

**Cross-scope validation in mutations**: The `addMetricAlertRule` / `updateMetricAlertRule`
resolvers must validate — *before* writing — that:

1. All provided `channelIds` belong to the same project as `targetId`. Each `alert_channels` row
   has a `project_id` column; join and reject with an error if any channel's project doesn't
   match.
2. If `savedFilterId` is provided, `savedFilter.projectId === target.projectId`. The FK to
   `saved_filters(id)` cannot enforce this cross-column invariant on its own. Follow the
   validation pattern already in use at
   `packages/services/api/src/modules/saved-filters/providers/saved-filters.provider.ts`.

Both failures should surface as structured errors via the `{ error: { message } }` result branch,
not thrown exceptions.

### 1.4 Evaluation Engine (Workflows Service)

#### Why the workflows service?

The workflows service (`packages/services/workflows/`) is our existing background job runner, built
on Graphile-Worker with PostgreSQL-backed task queues. It already runs periodic cron jobs (cleanup
tasks, etc.) and one-off tasks scheduled by the API (emails, webhooks). Metric alert evaluation — a
periodic job that queries data and sends notifications — is exactly what this service was built for.

#### Add ClickHouse to Workflows

The workflows service currently only has PostgreSQL access. We need to add a lightweight ClickHouse
HTTP client so it can query operations metrics.

- `packages/services/workflows/src/environment.ts` — add `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`,
  `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD`
- `packages/services/workflows/src/context.ts` — add `clickhouse` to Context
- `packages/services/workflows/src/lib/clickhouse-client.ts` — **new**, simple HTTP client built
  on `got` (matching the pattern used by `packages/services/workflows/src/lib/webhooks/send-webhook.ts`).
  The API's ClickHouse client is DI-heavy and ships with `agentkeepalive`; we just need raw query
  execution with retry on 5xx.
- `packages/services/workflows/src/index.ts` — instantiate and inject

#### Evaluation Task

**New file:** `packages/services/workflows/src/tasks/evaluate-metric-alert-rules.ts`

Cron:
- `* * * * * evaluateMetricAlertRules` (every minute)
- `0 4 * * * purgeExpiredAlertStateLog` (daily at 4:00 AM — deletes rows where `expires_at < NOW()`)

The ingestion pipeline (API buffer → Kafka → ClickHouse async insert) has a worst-case latency of
~31 seconds, so by the time each 1-minute cron tick fires, the previous minute's data is reliably
available. This gives on-call engineers a worst-case ~2 minute detection time.

1. Fetch all enabled metric alert rules from PostgreSQL. Single query joins with
   `metric_alert_rule_channels` → `alert_channels` (returning an array of channels per rule),
   `saved_filters` (via `saved_filter_id`, for filter contents), `targets`, `projects`,
   `organizations`.
2. Group by `(target_id, time_window_minutes, saved_filter_id)` to batch ClickHouse queries.
   Rules pointing at the same saved filter share a query.
3. Query ClickHouse for current window and previous window (with 1-minute offset to account for
   ingestion pipeline latency)
4. Compare metric values against thresholds
5. State machine transitions (using `state` and `state_changed_at` on the alert row):

   **When threshold IS breached:**
   - **NORMAL → PENDING**: set state to PENDING, set `state_changed_at` to now. No notification yet.
   - **PENDING (held < confirmation_minutes)**: remain PENDING, no action.
   - **PENDING (held >= confirmation_minutes) → FIRING**: create incident row, send alert
     notification to **all** channels attached via `metric_alert_rule_channels`, update state +
     `state_changed_at`, set `last_triggered_at = NOW()`.
   - **FIRING → FIRING**: no notification (prevent spam), update `last_evaluated_at`.
   - **RECOVERING → FIRING**: condition failed again before recovery confirmed. Set state back to
     FIRING, update `state_changed_at`. No notification (already sent).

   **When threshold is NOT breached:**
   - **NORMAL → NORMAL**: update `last_evaluated_at` only.
   - **PENDING → NORMAL**: false alarm — condition didn't hold long enough. Reset state to NORMAL,
     update `state_changed_at`. No notification.
   - **FIRING → RECOVERING**: set state to RECOVERING, set `state_changed_at` to now. No
     notification yet.
   - **RECOVERING (held < confirmation_minutes)**: remain RECOVERING, no action.
   - **RECOVERING (held >= confirmation_minutes) → NORMAL**: set `resolved_at` on open incident,
     send "resolved" notification to **all** channels attached via `metric_alert_rule_channels`,
     update state + `state_changed_at`.

#### ClickHouse Query Design

**Key optimization**: Fetch both windows and all metrics in a **single query** per
`(target, filter)` group. This serves latency, error rate, and traffic alerts simultaneously and
halves round-trips by returning both the current and previous window in one result.

The query uses **explicit sliding windows** rather than `toStartOfInterval` bucketing. Using
`toStartOfInterval` would snap to fixed time boundaries, producing partial buckets at the edges (and
potentially 3 rows instead of 2), leading to incorrect metric calculations. Instead, we define two
exact non-overlapping ranges and use a `CASE` expression to label each row:

```
now = current time
offset = 1 minute (ingestion pipeline latency buffer)
W = windowMinutes

currentWindow:  [now - offset - W, now - offset)
previousWindow: [now - offset - 2W, now - offset - W)
```

```sql
SELECT
  CASE
    WHEN timestamp >= {currentWindowStart} THEN 'current'
    ELSE 'previous'
  END as window,
  sum(total) as total,
  sum(total_ok) as total_ok,
  avgMerge(duration_avg) as average,
  quantilesMerge(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles
FROM operations_minutely
WHERE target = {targetId}
  AND timestamp >= {previousWindowStart}
  AND timestamp < {currentWindowEnd}
  [AND hash IN/NOT IN ({operationIds})]
  [AND (client_name, client_version) IN/NOT IN ({clientFilters})]
GROUP BY window
ORDER BY window
```

Where the boundaries are computed as:

- `currentWindowEnd = now - 1 minute`
- `currentWindowStart = now - 1 minute - W`
- `previousWindowStart = now - 1 minute - 2W`

This always returns exactly 2 rows (one per label), each aggregating a complete window with no
partial-bucket artifacts.

From these:

- **Latency**: pick the relevant percentile or average from each row
- **Error rate**: `(total - total_ok) / total * 100` per row
- **Traffic**: `total` per row

#### Threshold Comparison

- **FIXED_VALUE**: `currentValue > thresholdValue` (or `<` for BELOW direction)
- **PERCENTAGE_CHANGE**: `((currentValue - previousValue) / previousValue) * 100 > thresholdValue`

**Edge cases:**

- **Both windows have 0 data**: Skip evaluation entirely (no meaningful comparison possible).
- **Previous window is 0, current is > 0 (PERCENTAGE_CHANGE)**: Division by zero. Fall back to
  FIXED_VALUE comparison against the threshold — i.e., check `currentValue > thresholdValue`
  directly. This avoids a runtime error while still alerting on a meaningful spike from zero
  baseline.
- **Previous window is 0, current is 0 (PERCENTAGE_CHANGE)**: No change, treat as OK.
- **Current window has data but previous doesn't exist** (e.g., alert was just created): Skip
  evaluation until both windows have data.

### 1.5 Notifications from Workflows

**New file:** `packages/services/workflows/src/lib/metric-alert-notifier.ts`

Sends notifications directly from the workflows service (the API's DI container is not available
here):

- **Webhooks**: Reuse `packages/services/workflows/src/lib/webhooks/send-webhook.ts` directly. It
  already handles the `RequestBroker` path, retries via `args.helpers.job.attempts`, and uses
  `got`. No changes needed to webhook infrastructure.
- **Slack**: Instantiate `new WebClient(token)` from `@slack/web-api` and call
  `client.chat.postMessage(...)`. The token is fetched from PostgreSQL:
  `SELECT slack_token FROM organizations WHERE id = $1`. Mirror the message formatting from
  `packages/services/api/src/modules/alerts/providers/adapters/slack.ts` (color-coded
  `MessageAttachment[]`, mrkdwn, severity badges).

  > **Action required**: Add `"@slack/web-api": "7.10.0"` to
  > `packages/services/workflows/package.json` dependencies. It's currently only installed in the
  > API package. Keep the version aligned with `packages/services/api/package.json`.
- **Teams**: Raw `got.post()` to the channel's `webhook_endpoint` with a MessageCard JSON body.
  Mirror the payload shape from the API's `TeamsCommunicationAdapter` (truncated to 27KB).
- **Email**: Use `context.email.send()` (added in Phase 2).

Example messages:

Firing (Slack):

> :rotating_light: **Latency Alert: "API p99 Spike"** — Target: `my-target` in `my-project` p99
> latency is **450ms** (was 200ms, +125%) — Threshold: above 200ms

Resolved (Slack):

> :white_check_mark: **Resolved: "API p99 Spike"** — p99 latency is now **180ms** (threshold: 200ms)

Webhook payload:

```json
{
  "type": "metric_alert",
  "state": "firing",
  "alert": { "name": "...", "type": "LATENCY", "metric": "p99", "severity": "warning" },
  "currentValue": 450,
  "previousValue": 200,
  "changePercent": 125,
  "threshold": { "type": "FIXED_VALUE", "value": 200, "direction": "ABOVE" },
  "filter": { "savedFilterId": "...", "name": "My Filter", "contents": { "operationIds": ["abc123"] } },
  "target": { "slug": "..." },
  "project": { "slug": "..." },
  "organization": { "slug": "..." }
}
```

### 1.6 Alert State Log Retention

Alert state log retention is plan-gated, following the same pattern as operations data retention
(see `packages/services/api/src/modules/commerce/constants.ts`):

| Plan       | State log retention |
|------------|---------------------|
| Hobby      | 7 days              |
| Pro        | 7 days              |
| Enterprise | 30 days             |

When logging a state transition, the evaluation task looks up the organization's plan and sets
`expires_at` accordingly. A daily cron task (`purgeExpiredAlertStateLog`) deletes expired rows.

**File:** `packages/services/api/src/modules/commerce/constants.ts` — add
`alertStateLogRetentionDays` to each plan's limits.

### 1.7 Deployment

**File:** `deployment/services/workflows.ts` — add ClickHouse env vars to the workflows service
deployment config.

### Key files for Phase 1

| File                                                                          | Change                               |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| `packages/migrations/src/actions/2026.04.15T00-00-01.metric-alert-rules.ts`        | **New** — migration (rules, incidents, state log, **rule_channels join table**) |
| `packages/services/api/src/modules/alerts/providers/metric-alert-rules-storage.ts` | **New** — module-level CRUD provider (incl. setRuleChannels) |
| `packages/services/api/src/modules/alerts/module.graphql.ts`                  | Add MetricAlertRule types/mutations (multi-channel + savedFilter FK + eventCount + lastTriggeredAt) |
| `packages/services/api/src/modules/alerts/resolvers/`                         | New resolver files                   |
| `packages/services/api/src/modules/alerts/providers/alerts-manager.ts`        | Add metric alert methods             |
| `packages/services/workflows/package.json`                                    | Add `@slack/web-api` dependency      |
| `packages/services/workflows/src/environment.ts`                              | Add ClickHouse env vars              |
| `packages/services/workflows/src/context.ts`                                  | Add clickhouse to Context            |
| `packages/services/workflows/src/lib/clickhouse-client.ts`                    | **New** — lightweight CH client      |
| `packages/services/workflows/src/tasks/evaluate-metric-alert-rules.ts`             | **New** — evaluation cron task       |
| `packages/services/workflows/src/lib/metric-alert-notifier.ts`                | **New** — notification sender        |
| `packages/services/workflows/src/tasks/purge-expired-alert-state-log.ts`      | **New** — daily purge task           |
| `packages/services/workflows/src/index.ts`                                    | Register tasks + crontab             |
| `packages/services/api/src/modules/commerce/constants.ts`                     | Add alertStateLogRetentionDays       |
| `deployment/services/workflows.ts`                                            | ClickHouse env vars                  |

---

## Phase 2: Email Alert Channel

> **Status:** Deferred. This phase ships after Phase 1. Open design questions remain around how
> recipients are represented (free-form email strings vs. references to team members vs. a mix), and
> we want to gather feedback from the Phase 1 rollout before committing to a schema.

Follows the exact same pattern used when MS Teams was added
(`2024.06.11T10-10-00.ms-teams-webhook.ts`).

### 2.1 Database Migration

**New file:** `packages/migrations/src/actions/2026.04.15T00-00-00.email-alert-channel.ts`

```sql
ALTER TYPE alert_channel_type
ADD VALUE 'EMAIL';

-- Array of email addresses to support multiple recipients per channel
ALTER TABLE alert_channels
ADD COLUMN email_addresses TEXT [];
```

**Important:** This migration must use `noTransaction: true` because PostgreSQL does not allow
`ALTER TYPE ... ADD VALUE` inside a transaction block. The migration runner (`pg-migrator.ts`) wraps
migrations in transactions by default — the `noTransaction` flag opts out. There are 18+ existing
migrations using this pattern (e.g., index creation with `CREATE INDEX CONCURRENTLY`). Note: the
existing MS Teams migration (`2024.06.11T10-10-00.ms-teams-webhook.ts`) is missing this flag, which
is a latent bug.

```typescript
export default {
  name: '2026.04.15T00-00-00.email-alert-channel.ts',
  noTransaction: true,
  run: ({ sql }) => [
    {
      name: 'Add EMAIL to alert_channel_type',
      query: sql`ALTER TYPE alert_channel_type ADD VALUE 'EMAIL'`
    },
    {
      name: 'Add email_addresses column',
      query: sql`ALTER TABLE alert_channels ADD COLUMN email_addresses TEXT[]`
    }
  ]
} satisfies MigrationExecutor
```

Register in `packages/migrations/src/run-pg-migrations.ts`.

### 2.2 Data Access

The legacy storage service (`packages/services/storage/src/index.ts`) will not be extended. Instead,
following the modern pattern used by recent modules (app-deployments, schema-proposals,
saved-filters), we create a module-level provider that injects `PG_POOL_CONFIG` directly.

**New file:** `packages/services/api/src/modules/alerts/providers/alert-channels-storage.ts`

```typescript
@Injectable({ scope: Scope.Operation })
export class AlertChannelsStorage {
  constructor(@Inject(PG_POOL_CONFIG) private pool: DatabasePool) {}

  async addAlertChannel(input: { ... emailAddresses?: string[] | null }) { ... }
  async getAlertChannels(projectId: string) { ... }
  async deleteAlertChannels(projectId: string, channelIds: string[]) { ... }
}
```

This provider takes over alert channel CRUD from the legacy storage module. Existing callers in
`AlertsManager` are updated to use this new provider instead.

**File:** `packages/services/api/src/shared/entities.ts` — add `emailAddresses: string[] | null` to
`AlertChannel` interface.

### 2.3 GraphQL API

**File:** `packages/services/api/src/modules/alerts/module.graphql.ts`

```graphql
# Add EMAIL to existing enum
enum AlertChannelType { SLACK, WEBHOOK, MSTEAMS_WEBHOOK, EMAIL }

# New implementing type
type AlertEmailChannel implements AlertChannel {
  id: ID!
  name: String!
  type: AlertChannelType!
  emails: [String!]!
}

# New input — accepts multiple recipients
input EmailChannelInput {
  emails: [String!]!
}

# Update AddAlertChannelInput to include email field
input AddAlertChannelInput {
  ...existing fields...
  email: EmailChannelInput
}
```

### 2.4 Resolvers

**New file:** `packages/services/api/src/modules/alerts/resolvers/AlertEmailChannel.ts`

```typescript
export const AlertEmailChannel: AlertEmailChannelResolvers = {
  __isTypeOf: channel => channel.type === 'EMAIL',
  emails: channel => channel.emailAddresses ?? []
}
```

**File:** `packages/services/api/src/modules/alerts/resolvers/Mutation/addAlertChannel.ts`

- Add Zod validation:
  `email: MaybeModel(z.object({ emails: z.array(z.string().email().max(255)).min(1).max(10) }))`
- Pass `emailAddresses: input.email?.emails` to AlertsManager

### 2.5 AlertsManager

**File:** `packages/services/api/src/modules/alerts/providers/alerts-manager.ts`

- Update `addChannel()` input to accept `emailAddresses?: string[] | null`
- Pass through to storage
- Update `triggerChannelConfirmation()` to handle EMAIL type
- Update `triggerSchemaChangeNotifications()` to dispatch via email adapter

### 2.6 Email Communication Adapter

**New file:** `packages/services/api/src/modules/alerts/providers/adapters/email.ts`

Implements `CommunicationAdapter` interface. Uses `TaskScheduler` to schedule an email task in the
workflows service (same pattern as `WebhookCommunicationAdapter` which schedules
`SchemaChangeNotificationTask`).

```typescript
@Injectable()
export class EmailCommunicationAdapter implements CommunicationAdapter {
  constructor(
    private taskScheduler: TaskScheduler,
    private logger: Logger
  ) {}

  async sendSchemaChangeNotification(input: SchemaChangeNotificationInput) {
    await this.taskScheduler.scheduleTask(AlertEmailNotificationTask, {
      recipients: input.channel.emailAddresses ?? [],
      event: {
        /* schema change details */
      }
    })
  }

  async sendChannelConfirmation(input: ChannelConfirmationInput) {
    await this.taskScheduler.scheduleTask(AlertEmailConfirmationTask, {
      recipients: input.channel.emailAddresses ?? [],
      event: input.event
    })
  }
}
```

### 2.7 Email Task + Template (Workflows Service)

**New file:** `packages/services/workflows/src/tasks/alert-email-notification.ts`

- Define `AlertEmailNotificationTask` and `AlertEmailConfirmationTask`
- Send emails using `context.email.send()` with MJML templates (same pattern as
  `email-verification.ts`)

**New file:** `packages/services/workflows/src/lib/emails/templates/alert-notification.ts`

- MJML email template for schema change notifications (use existing `email()`, `paragraph()`,
  `button()` helpers from `components.ts`)

**File:** `packages/services/workflows/src/index.ts` — register new task module

### 2.8 Module Registration

**File:** `packages/services/api/src/modules/alerts/index.ts` — add `EmailCommunicationAdapter` to
providers

### 2.9 Frontend

**File:** `packages/web/app/src/components/project/alerts/create-channel.tsx`

- Add email addresses field with Zod validation (the existing form uses Yup + Formik, but new form
  code should use Zod + react-hook-form to match the current codebase convention)
- Show email input when type === EMAIL
- Pass `email: { emails: values.emailAddresses }` in mutation

**File:** `packages/web/app/src/components/project/alerts/channels-table.tsx`

- Handle `AlertEmailChannel` typename to display the email addresses

### Key files for Phase 2

| File                                                                             | Change                                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/migrations/src/actions/2026.04.15T00-00-00.email-alert-channel.ts`     | **New** — migration                                            |
| `packages/migrations/src/run-pg-migrations.ts`                                   | Register migration                                             |
| `packages/services/api/src/modules/alerts/providers/alert-channels-storage.ts`   | **New** — module-level CRUD provider (replaces legacy storage) |
| `packages/services/api/src/shared/entities.ts`                                   | Add emailAddresses to AlertChannel                             |
| `packages/services/api/src/modules/alerts/module.graphql.ts`                     | Add AlertEmailChannel type + EmailChannelInput                 |
| `packages/services/api/src/modules/alerts/resolvers/AlertEmailChannel.ts`        | **New** — resolver                                             |
| `packages/services/api/src/modules/alerts/resolvers/Mutation/addAlertChannel.ts` | Add email validation + input                                   |
| `packages/services/api/src/modules/alerts/providers/alerts-manager.ts`           | Handle EMAIL in dispatch                                       |
| `packages/services/api/src/modules/alerts/providers/adapters/email.ts`           | **New** — adapter                                              |
| `packages/services/api/src/modules/alerts/index.ts`                              | Register adapter                                               |
| `packages/services/workflows/src/tasks/alert-email-notification.ts`              | **New** — email task                                           |
| `packages/services/workflows/src/lib/emails/templates/alert-notification.ts`     | **New** — MJML template                                        |
| `packages/services/workflows/src/index.ts`                                       | Register task                                                  |
| `packages/web/app/src/components/project/alerts/create-channel.tsx`              | Add email form field                                           |
| `packages/web/app/src/components/project/alerts/channels-table.tsx`              | Display email channels                                         |

---

## Open Question: Time Window Sizes and ClickHouse Data Retention

The UI mockup shows "every 7d" as a time window option. Supporting larger windows is valuable — for
example, a user might set a weekly traffic alert to track projected monthly usage. However, larger
windows interact with ClickHouse data retention in ways worth discussing.

### How alert evaluation works with ClickHouse

Each alert evaluation compares two time windows:

- **Current window**: the most recent N minutes of data
- **Previous window**: the N minutes before that (used as the baseline for comparison)

This means the query looks back **2x the window size**. A 7-day alert looks 14 days back.

### ClickHouse materialized view retention

Our ClickHouse tables have different TTLs and granularities:

| Table                 | Granularity      | TTL      | Max alert window (2x lookback) |
| --------------------- | ---------------- | -------- | ------------------------------ |
| `operations_minutely` | 1-minute buckets | 24 hours | ~6 hours                       |
| `operations_hourly`   | 1-hour buckets   | 30 days  | ~14 days                       |
| `operations_daily`    | 1-day buckets    | 1 year   | ~6 months                      |

The evaluation engine automatically selects the appropriate table based on window size.

### Tradeoffs with larger windows

**Granularity vs. sensitivity**: Larger windows require coarser-grained tables. A 7-day alert uses
the hourly table, meaning data is aggregated in 1-hour buckets. A brief 10-minute latency spike
would be smoothed into an hourly average and might not trigger the alert. For use cases like weekly
traffic totals this is fine, but for spike detection shorter windows are more appropriate.

**Evaluation frequency vs. window size**: The cron job runs every minute (see section 2.4). For a
7-day window, the result shifts by 1 minute out of 10,080 — consecutive evaluations produce nearly
identical values. This is harmless but slightly wasteful. A future optimization could scale
evaluation frequency with window size (e.g., hourly evaluation for daily/weekly alerts).

**ClickHouse query cost**: The single-query optimization (fetching both windows in one
`CASE`-labeled query) works regardless of window size — it always returns 2 rows. Query cost scales
with the number of distinct `(target, filter)` groups, not with window length. At ~100 groups,
that's ~100 queries per minute, which is modest given ClickHouse's primary key efficiency (`target`
is the first key, timestamp is in the sort order, and daily partitions auto-prune irrelevant data).

### Recommendation

Support window sizes from **5 minutes up to 14 days** (20,160 minutes). This covers:

- Short-term spike detection (5m–1h on minutely table)
- Medium-term trend monitoring (1h–6h on minutely table)
- Daily/weekly usage tracking (1d–14d on hourly table)

The 14-day cap ensures the comparison window (28 days back) fits comfortably within the hourly
table's 30-day TTL. If there's demand for 30-day windows in the future, those would fall to the
daily table (1-year TTL) and could be added later.

**Should we support a different range, or is 5 minutes to 14 days sufficient for V1?**

---

## Open Question: Specialized ClickHouse Materialized View

The existing `operations_minutely` table stores one row per
`(target, hash, client_name, client_version, minute)`:

```
ORDER BY (target, hash, client_name, client_version, timestamp)
```

For a target-wide alert (no operation/client filters), the evaluation query must aggregate across
all operation hashes and client combinations. A target with 500 operations and 10 client versions
produces ~5,000 rows per minute. For a 30-minute window comparing current vs. previous, the query
scans and merges **~300,000 rows** of `AggregateFunction` state.

### Would a target-level MV help?

A specialized materialized view pre-aggregated at the target level:

```sql
CREATE MATERIALIZED VIEW DEFAULT.operations_target_minutely (
  target LowCardinality (STRING) CODEC (ZSTD (1)),
  timestamp DateTime ('UTC') CODEC (DoubleDelta, LZ4),
  total UInt32 CODEC (T64, ZSTD (1)),
  total_ok UInt32 CODEC (T64, ZSTD (1)),
  duration_avg AggregateFunction (AVG, UInt64) CODEC (ZSTD (1)),
  duration_quantiles AggregateFunction (quantiles (0.75, 0.9, 0.95, 0.99), UInt64) CODEC (ZSTD (1))
) ENGINE = SummingMergeTree PRIMARY KEY (target)
ORDER BY
  (target, timestamp) TTL timestamp + INTERVAL 24 HOUR AS
SELECT
  target,
  toStartOfMinute (timestamp) AS timestamp,
  count() AS total,
  sum(ok) AS total_ok,
  avgState (duration) AS duration_avg,
  quantilesState (0.75, 0.9, 0.95, 0.99) (duration) AS duration_quantiles
FROM
  DEFAULT.operations
GROUP BY
  target,
  timestamp
```

This collapses the 5,000 rows/minute down to **1 row per (target, minute)**. The same 30-minute
alert query would scan ~60 rows instead of ~300,000.

### Tradeoffs

**Benefits:**

- Dramatically fewer rows to scan for target-wide alerts (the common case)
- Simpler, faster merges — no hash/client dimensions to aggregate across
- Smaller on-disk footprint for this view

**Costs:**

- Additional write amplification — every INSERT into `operations` triggers one more MV
  materialization
- Rules scoped to a saved filter (operation/client filters) can't use this view — they still
  need `operations_minutely` to filter by `hash` or `client_name`/`client_version`
- One more table to maintain and migrate

### Recommendation

For V1, we could start with the existing `operations_minutely` table and measure actual query
performance. The primary key starts with `target`, so ClickHouse can efficiently skip irrelevant
data even without a dedicated view. If we observe query latency issues at scale, we add the
specialized MV as an optimization.

Alternatively, if we expect many target-wide alerts (likely the majority), adding the MV upfront
avoids a future ClickHouse migration.

**Should we add a target-level MV now, or start with existing tables and optimize later?**

---

## Performance & Scaling

### Evaluation architecture

A **single cron job** runs every minute and evaluates **all** enabled metric alerts. It does not
create one job per alert. The process:

1. One PostgreSQL query fetches all enabled alerts (joined with channels, targets, orgs)
2. Alerts are grouped by `(target_id, time_window_minutes, filter)` — alerts sharing the same group
   are served by a **single ClickHouse query**
3. Each ClickHouse query returns both time windows and all metrics (latency percentiles, totals, ok
   counts) in one result set, serving multiple alert types simultaneously

### How it scales

Query count scales with **unique groups**, not alert count. Three alerts on the same target (e.g.,
latency + errors + traffic with the same window and no filter) cost exactly one ClickHouse query.

| Scenario | Configured alerts | Unique groups | CH queries/tick | Est. time (5 concurrent) |
| -------- | ----------------- | ------------- | --------------- | ------------------------ |
| Small    | 10                | ~5            | 5               | ~10ms                    |
| Medium   | 100               | ~30           | 30              | ~60ms                    |
| Large    | 1,000             | ~150          | 150             | ~300ms                   |

Even at 1,000 alerts, evaluation completes in well under a second. The practical ceiling is the
ClickHouse connection pool (32 sockets) and the 60-second task timeout.

### Safeguards

- **Task timeout**: 60 seconds. Graphile-Worker deduplicates cron tasks, so an overrunning
  evaluation won't spawn a second concurrent instance.
- **Query timeout**: 10 seconds per ClickHouse query (matching existing timeouts in
  `operations-reader.ts`).
- **Bounded concurrency**: ClickHouse queries execute with `p-queue` concurrency of 5 to avoid
  saturating the connection pool.

---

## Verification

### Phase 1

1. Run migration, verify `metric_alert_rules` table created
2. CRUD metric alerts via GraphQL playground
3. Trigger `evaluateMetricAlertRules` task manually, verify ClickHouse queries and state transitions
4. Create a webhook metric alert, simulate threshold breach, verify webhook receives payload
5. Add integration test in `integration-tests/tests/api/project/alerts.spec.ts`

### Phase 2

1. Run migration, verify `alert_channel_type` enum has `EMAIL` and `email_addresses` column exists
2. Create an EMAIL channel via GraphQL playground, verify it persists
3. Create a schema-change alert using the EMAIL channel, publish a schema change, verify email is
   sent
4. Verify frontend form shows email option and validates correctly
